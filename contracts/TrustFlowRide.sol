// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrustFlowRide
 * @dev 订单管理合约 - 管理网约车订单的创建、匹配和状态
 */
contract TrustFlowRide is Ownable, Pausable, ReentrancyGuard {
    
    // 订单状态
    enum Status {
        Pending,        // 待接单
        Accepted,       // 已接单
        PickedUp,       // 已上车
        Completed,      // 已完成
        Cancelled       // 已取消
    }
    
    // 行程生命周期状态
    enum RideStatus {
        NONE,                // 无状态
        CREATED,             // 已创建
        ACCEPTED,            // 已接单
        IN_PROGRESS,         // 进行中
        COMPLETED,           // 已完成
        AWAITING_SETTLEMENT, // 等待结算（争议窗口阶段）
        SETTLED              // 已结算
    }
    
    // 位置信息
    struct Location {
        int256 latitude;    // 纬度（乘以10^6）
        int256 longitude;   // 经度（乘以10^6）
        string addressText; // 地址文本
    }
    
    // 订单信息
    struct Order {
        uint256 orderId;
        address passenger;          // 乘客地址
        address driver;             // 司机地址
        Location pickup;            // 上车点
        Location destination;       // 目的地
        string category;            // 订单类别（例如：车辆租赁、房屋租赁、设备租赁等）
        string subCategory;         // 订单子类别（例如：小轿车、SUV、摩托车等）
        uint256 estimatedFare;      // 预估费用
        uint256 actualFare;         // 实际费用
        Status status;              // 订单状态
        RideStatus rideStatus;      // 行程生命周期状态
        uint256 createdAt;          // 创建时间
        uint256 acceptedAt;         // 接单时间
        uint256 pickedUpAt;         // 上车时间
        uint256 completedAt;        // 完成时间
        uint256 startTimestamp;     // 行程开始时间
        uint256 endTimestamp;       // 行程结束时间
        string ipfsHash;            // IPFS存储的详细信息哈希
        // --- Dispute 相关字段 ---
        bool disputeOpened;         // 争议是否已开启
        bool disputeResolved;       // 争议是否已解决
        address disputeOpener;      // 谁发起的争议
        address disputeWinner;      // 平台判定的胜诉方
        string disputeReason;       // 初次发起争议的理由
        uint256 disputeOpenedAt;     // 发起争议的时间
        uint256 disputeResolvedAt;   // 争议被解决的时间
        string disputeResolutionDetail; // 平台的裁决说明
    }
    
    // 状态变量
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public passengerOrders;   // 乘客的订单列表
    mapping(address => uint256[]) public driverOrders;      // 司机的订单列表
    uint256 public orderCount;
    bool private orderCountInitialized;  // 标记orderCount是否已初始化
    
    // 平台配置
    address public platformWallet;      // 平台钱包地址
    uint256 public constant PLATFORM_FEE_RATE = 500;  // 平台费率：5% (500 basis points = 5%)
    uint256 public constant BASIS_POINTS = 10000;     // 100% = 10000 basis points
    uint256 public disputeWindow = 3600; // 争议窗口时间（单位：秒，默认1小时）
    
    // 事件
    event OrderCreated(
        uint256 indexed orderId,
        address indexed passenger,
        int256 pickupLat,
        int256 pickupLng,
        int256 destLat,
        int256 destLng,
        string category,
        string subCategory,
        uint256 estimatedFare
    );
    event OrderAccepted(uint256 indexed orderId, address indexed driver);
    event PassengerPickedUp(uint256 indexed orderId, uint256 timestamp);
    event OrderCompleted(uint256 indexed orderId, uint256 actualFare, uint256 timestamp);
    event OrderCancelled(uint256 indexed orderId, address indexed cancelledBy, string reason);
    event OrderUpdated(uint256 indexed orderId, string ipfsHash);
    event PaymentReleased(uint256 indexed orderId, address indexed driver, uint256 driverAmount, uint256 platformFee);
    event RefundIssued(uint256 indexed orderId, address indexed passenger, uint256 amount);
    event RideAccepted(uint256 indexed orderId, address indexed driver, uint256 timestamp);
    event RideStarted(uint256 indexed orderId, uint256 timestamp);
    event RideCompleted(uint256 indexed orderId, uint256 timestamp);
    event RideSettled(uint256 indexed orderId, uint256 timestamp);
    event DisputeOpened(
        uint256 indexed orderId,
        address indexed opener,
        string reason,
        uint256 timestamp
    );
    
    event DisputeResolved(
        uint256 indexed orderId,
        address indexed winner,
        string detail,
        uint256 timestamp
    );
    
    // 构造函数
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Platform wallet cannot be zero address");
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev 设置平台钱包地址（仅所有者）
     * @param _platformWallet 新的平台钱包地址
     */
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "Platform wallet cannot be zero address");
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev 设置争议窗口时间（仅所有者）
     * @param newWindow 新的争议窗口时间（单位：秒）
     */
    function setDisputeWindow(uint256 newWindow) external onlyOwner {
        disputeWindow = newWindow;
    }
    
    /**
     * @dev 设置初始订单ID（仅所有者，只能调用一次）
     * @param _initialOrderId 初始订单ID
     */
    function setInitialOrderId(uint256 _initialOrderId) external onlyOwner {
        require(!orderCountInitialized, "Order count already initialized");
        require(_initialOrderId > 0, "Initial order ID must be greater than 0");
        orderCount = _initialOrderId;
        orderCountInitialized = true;
    }
    
    // 修饰符
    modifier onlyPassenger(uint256 _orderId) {
        require(orders[_orderId].passenger == msg.sender, "Only passenger");
        _;
    }
    
    modifier onlyDriver(uint256 _orderId) {
        require(orders[_orderId].driver == msg.sender, "Only driver");
        _;
    }
    
    modifier orderExists(uint256 _orderId) {
        require(_orderId < orderCount, "Order does not exist");
        _;
    }
    
    /**
     * @dev 创建订单并锁定资金
     * @param _pickupLat 上车点纬度
     * @param _pickupLng 上车点经度
     * @param _pickupAddress 上车点地址
     * @param _destLat 目的地纬度
     * @param _destLng 目的地经度
     * @param _destAddress 目的地地址
     * @param _category 订单类别（默认使用 "General"）
     * @param _subCategory 订单子类别（默认使用 "Standard"）
     * @param _estimatedFare 预估费用（必须与 msg.value 匹配）
     */
    function createOrder(
        int256 _pickupLat,
        int256 _pickupLng,
        string memory _pickupAddress,
        int256 _destLat,
        int256 _destLng,
        string memory _destAddress,
        string memory _category,
        string memory _subCategory,
        uint256 _estimatedFare
    ) external payable whenNotPaused returns (uint256) {
        require(_estimatedFare > 0, "Fare must be greater than 0");
        require(msg.value == _estimatedFare, "Payment amount must match estimated fare");
        
        // 如果 category 为空，使用默认值
        if (bytes(_category).length == 0) {
            _category = "General";
        }
        
        // 如果 subCategory 为空，使用默认值
        if (bytes(_subCategory).length == 0) {
            _subCategory = "Standard";
        }
        
        uint256 orderId = orderCount++;
        
        orders[orderId] = Order({
            orderId: orderId,
            passenger: msg.sender,
            driver: address(0),
            pickup: Location(_pickupLat, _pickupLng, _pickupAddress),
            destination: Location(_destLat, _destLng, _destAddress),
            category: _category,
            subCategory: _subCategory,
            estimatedFare: _estimatedFare,
            actualFare: 0,
            status: Status.Pending,
            rideStatus: RideStatus.CREATED,
            createdAt: block.timestamp,
            acceptedAt: 0,
            pickedUpAt: 0,
            completedAt: 0,
            startTimestamp: 0,
            endTimestamp: 0,
            ipfsHash: "",
            disputeOpened: false,
            disputeResolved: false,
            disputeOpener: address(0),
            disputeWinner: address(0),
            disputeReason: "",
            disputeOpenedAt: 0,
            disputeResolvedAt: 0,
            disputeResolutionDetail: ""
        });
        
        passengerOrders[msg.sender].push(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            _pickupLat,
            _pickupLng,
            _destLat,
            _destLng,
            _category,
            _subCategory,
            _estimatedFare
        );
        
        return orderId;
    }
    
    /**
     * @dev 司机接单
     * @param _orderId 订单ID
     */
    function acceptOrder(uint256 _orderId) external orderExists(_orderId) whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.status == Status.Pending, "Order not available");
        require(order.passenger != msg.sender, "Cannot accept own order");
        
        order.driver = msg.sender;
        order.status = Status.Accepted;
        order.rideStatus = RideStatus.ACCEPTED;
        order.acceptedAt = block.timestamp;
        
        driverOrders[msg.sender].push(_orderId);
        
        emit OrderAccepted(_orderId, msg.sender);
        emit RideAccepted(_orderId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 司机接单（行程生命周期专用）
     * @param _orderId 订单ID
     */
    function acceptRide(uint256 _orderId) external orderExists(_orderId) {
        Order storage o = orders[_orderId];
        require(o.rideStatus == RideStatus.CREATED, "Invalid status");
        require(msg.sender == o.driver, "Only driver");
        
        o.rideStatus = RideStatus.ACCEPTED;
        if (o.acceptedAt == 0) {
            o.acceptedAt = block.timestamp;
        }
        
        emit RideAccepted(_orderId, o.driver, block.timestamp);
    }
    
    /**
     * @dev 确认乘客上车
     * @param _orderId 订单ID
     */
    function confirmPickup(uint256 _orderId) external orderExists(_orderId) onlyDriver(_orderId) {
        Order storage order = orders[_orderId];
        require(order.status == Status.Accepted, "Invalid status");
        
        order.status = Status.PickedUp;
        order.rideStatus = RideStatus.IN_PROGRESS;
        order.pickedUpAt = block.timestamp;
        order.startTimestamp = block.timestamp;
        
        emit PassengerPickedUp(_orderId, block.timestamp);
        emit RideStarted(_orderId, block.timestamp);
    }
    
    /**
     * @dev 开始行程（行程生命周期专用）
     * @param _orderId 订单ID
     */
    function startRide(uint256 _orderId) external orderExists(_orderId) {
        Order storage o = orders[_orderId];
        require(o.rideStatus == RideStatus.ACCEPTED, "Invalid status");
        require(msg.sender == o.driver, "Only driver");
        
        o.rideStatus = RideStatus.IN_PROGRESS;
        o.startTimestamp = block.timestamp;
        if (o.pickedUpAt == 0) {
            o.pickedUpAt = block.timestamp;
        }
        if (o.status == Status.Accepted) {
            o.status = Status.PickedUp;
        }
        
        emit RideStarted(_orderId, block.timestamp);
    }
    
    /**
     * @dev 完成订单并释放资金
     * @param _orderId 订单ID
     * @param _actualFare 实际费用
     */
    function completeOrder(uint256 _orderId, uint256 _actualFare) 
        external 
        orderExists(_orderId) 
        nonReentrant
    {
        Order storage order = orders[_orderId];
        require(order.status == Status.PickedUp, "Order not picked up");
        require(_actualFare > 0, "Invalid fare");
        require(order.driver != address(0), "Order has no driver");
        
        // 允许司机或乘客调用（作为到期模拟）
        require(
            msg.sender == order.driver || msg.sender == order.passenger,
            "Only driver or passenger"
        );
        
        // 更新订单状态
        require(order.rideStatus == RideStatus.IN_PROGRESS, "Ride must be in progress");
        
        order.status = Status.Completed;
        order.actualFare = _actualFare;
        order.completedAt = block.timestamp;
        order.endTimestamp = block.timestamp;
        
        emit OrderCompleted(_orderId, _actualFare, block.timestamp);
        emit RideCompleted(_orderId, block.timestamp);
        
        // 订单完成后进入等待结算状态（允许争议窗口）
        order.rideStatus = RideStatus.AWAITING_SETTLEMENT;
        
        // 如果没有争议，立即结算（正常交易流程）
        // 注意：如果有争议窗口期的要求，可以在争议窗口期结束后调用settle函数
        // 但为了用户体验，正常交易完成后立即结算
        if (!order.disputeOpened) {
            // 立即结算（正常交易流程）
            _settleOrder(_orderId);
        }
        // 如果已有争议，等待争议解决后再调用settle
    }
    
    /**
     * @dev 内部函数：结算订单
     * @param _orderId 订单ID
     */
    function _settleOrder(uint256 _orderId) internal {
        Order storage o = orders[_orderId];
        require(
            o.rideStatus == RideStatus.AWAITING_SETTLEMENT,
            "Order not ready to settle"
        );
        
        // 如果存在争议但未解决，禁止结算
        require(
            !o.disputeOpened || (o.disputeOpened && o.disputeResolved),
            "Dispute not resolved"
        );
        
        // 使用 estimatedFare（订单创建时锁定的金额）来计算费用分配
        uint256 orderAmount = o.estimatedFare;
        uint256 platformFee = (orderAmount * PLATFORM_FEE_RATE) / BASIS_POINTS;
        
        // 确保合约余额足够支付所有费用
        require(address(this).balance >= orderAmount, "Insufficient contract balance");
        
        // 如果争议已解决，根据争议获胜方决定资金分配
        if (o.disputeOpened && o.disputeResolved) {
            if (o.disputeWinner == o.passenger) {
                // 乘客获胜：退款给乘客（扣除平台手续费）
                uint256 passengerRefund = orderAmount - platformFee;
                
                // 先转账平台费给平台钱包（优先保证平台费收取）
                if (platformFee > 0) {
                    (bool platformSuccess, ) = payable(platformWallet).call{value: platformFee}("");
                    require(platformSuccess, "Platform fee payment failed");
                }
                
                // 再退款给乘客（扣除平台费后的金额）
                (bool passengerSuccess, ) = payable(o.passenger).call{value: passengerRefund}("");
                require(passengerSuccess, "Passenger refund failed");
                
                o.rideStatus = RideStatus.SETTLED;
                emit RefundIssued(_orderId, o.passenger, passengerRefund);
                emit RideSettled(_orderId, block.timestamp);
            } else if (o.disputeWinner == o.driver) {
                // 司机获胜：正常分配（司机获得金额，平台获得手续费）
                uint256 driverAmount = orderAmount - platformFee;
                
                // 先转账平台费给平台钱包（优先保证平台费收取）
                if (platformFee > 0) {
                    (bool platformSuccess, ) = payable(platformWallet).call{value: platformFee}("");
                    require(platformSuccess, "Platform fee payment failed");
                }
                
                // 再转账给司机（扣除平台费后的金额）
                (bool driverSuccess, ) = payable(o.driver).call{value: driverAmount}("");
                require(driverSuccess, "Driver payment failed");
                
                o.rideStatus = RideStatus.SETTLED;
                emit PaymentReleased(_orderId, o.driver, driverAmount, platformFee);
                emit RideSettled(_orderId, block.timestamp);
            } else {
                revert("Invalid dispute winner");
            }
        } else {
            // 无争议或争议未解决：正常分配（司机获得金额，平台获得手续费）
            uint256 driverAmount = orderAmount - platformFee;
            
            // 先转账平台费给平台钱包（优先保证平台费收取）
            if (platformFee > 0) {
                (bool platformSuccess, ) = payable(platformWallet).call{value: platformFee}("");
                require(platformSuccess, "Platform fee payment failed");
            }
            
            // 再转账给司机（扣除平台费后的金额）
            (bool driverSuccess, ) = payable(o.driver).call{value: driverAmount}("");
            require(driverSuccess, "Driver payment failed");
            
            o.rideStatus = RideStatus.SETTLED;
            emit PaymentReleased(_orderId, o.driver, driverAmount, platformFee);
            emit RideSettled(_orderId, block.timestamp);
        }
    }
    
    /**
     * @dev 结束行程（司机，行程生命周期专用）
     * @param _orderId 订单ID
     */
    function completeRide(uint256 _orderId) external orderExists(_orderId) {
        Order storage o = orders[_orderId];
        require(o.rideStatus == RideStatus.IN_PROGRESS, "Invalid status");
        require(msg.sender == o.driver, "Only driver");
        
        // 将 rideStatus 从 IN_PROGRESS 改为 COMPLETED
        o.rideStatus = RideStatus.COMPLETED;
        o.endTimestamp = block.timestamp;
        if (o.completedAt == 0) {
            o.completedAt = block.timestamp;
        }
        if (o.status == Status.PickedUp) {
            o.status = Status.Completed;
        }
        
        emit RideCompleted(_orderId, block.timestamp);
        
        // 然后状态变为 AWAITING_SETTLEMENT（等待结算 / 争议窗口阶段）
        o.rideStatus = RideStatus.AWAITING_SETTLEMENT;
    }
    
    /**
     * @dev 取消订单并退款
     * @param _orderId 订单ID
     * @param _reason 取消原因
     */
    function cancelOrder(uint256 _orderId, string memory _reason) 
        external 
        orderExists(_orderId)
        nonReentrant
    {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.passenger || msg.sender == order.driver,
            "Unauthorized"
        );
        require(
            order.status == Status.Pending || order.status == Status.Accepted,
            "Cannot cancel"
        );
        
        // 更新订单状态
        order.status = Status.Cancelled;
        
        // 退款给乘客（全额退款）
        uint256 refundAmount = order.estimatedFare;
        if (refundAmount > 0 && address(this).balance >= refundAmount) {
            (bool success, ) = payable(order.passenger).call{value: refundAmount}("");
            require(success, "Refund failed");
            emit RefundIssued(_orderId, order.passenger, refundAmount);
        }
        
        emit OrderCancelled(_orderId, msg.sender, _reason);
    }
    
    /**
     * @dev 更新订单IPFS哈希（存储详细信息）
     * @param _orderId 订单ID
     * @param _ipfsHash IPFS哈希
     */
    function updateOrderIPFS(uint256 _orderId, string memory _ipfsHash) 
        external 
        orderExists(_orderId) 
    {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.passenger || msg.sender == order.driver || msg.sender == owner(),
            "Unauthorized"
        );
        
        order.ipfsHash = _ipfsHash;
        
        emit OrderUpdated(_orderId, _ipfsHash);
    }
    
    /**
     * @dev 获取订单详情
     * @param _orderId 订单ID
     */
    function getOrder(uint256 _orderId) external view orderExists(_orderId) returns (Order memory) {
        return orders[_orderId];
    }
    
    /**
     * @dev 获取行程状态
     * @param _orderId 订单ID
     * @return 行程状态枚举值
     */
    function getRideStatus(uint256 _orderId) external view orderExists(_orderId) returns (RideStatus) {
        return orders[_orderId].rideStatus;
    }
    
    /**
     * @dev 获取乘客的所有订单
     * @param _passenger 乘客地址
     */
    function getPassengerOrders(address _passenger) external view returns (uint256[] memory) {
        return passengerOrders[_passenger];
    }
    
    /**
     * @dev 获取司机的所有订单
     * @param _driver 司机地址
     */
    function getDriverOrders(address _driver) external view returns (uint256[] memory) {
        return driverOrders[_driver];
    }
    
    /**
     * @dev 获取待接单的订单数量
     */
    function getPendingOrdersCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < orderCount; i++) {
            if (orders[i].status == Status.Pending) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev 提交争议
     * @param _orderId 订单ID
     * @param _reason 争议原因
     */
    function submitDispute(uint256 _orderId, string memory _reason) 
        external 
        orderExists(_orderId) 
        whenNotPaused 
    {
        Order storage o = orders[_orderId];
        
        require(
            o.rideStatus == RideStatus.AWAITING_SETTLEMENT,
            "Order not in AWAITING_SETTLEMENT"
        );
        require(o.disputeOpened == false, "Already disputed");
        require(
            msg.sender == o.passenger || msg.sender == o.driver,
            "Only passenger or driver can dispute"
        );
        require(
            block.timestamp <= o.completedAt + disputeWindow,
            "Dispute window closed"
        );
        
        o.disputeOpened = true;
        o.disputeOpener = msg.sender;
        o.disputeReason = _reason;
        o.disputeOpenedAt = block.timestamp;
        
        emit DisputeOpened(_orderId, msg.sender, _reason, block.timestamp);
    }
    
    /**
     * @dev 解决争议（仅所有者）
     * @param _orderId 订单ID
     * @param _winner 获胜方地址（乘客或司机）
     * @param _detail 解决方案详情
     */
    function resolveDispute(uint256 _orderId, address _winner, string memory _detail) 
        external 
        onlyOwner 
        orderExists(_orderId) 
    {
        Order storage o = orders[_orderId];
        require(o.disputeOpened == true, "No dispute");
        require(o.disputeResolved == false, "Already resolved");
        require(
            _winner == o.passenger || _winner == o.driver,
            "Winner must be passenger or driver"
        );
        
        o.disputeResolved = true;
        o.disputeWinner = _winner;
        o.disputeResolvedAt = block.timestamp;
        o.disputeResolutionDetail = _detail;
        
        emit DisputeResolved(_orderId, _winner, _detail, block.timestamp);
    }
    
    /**
     * @dev 获取争议状态
     * @param _orderId 订单ID
     */
    function getDisputeStatus(uint256 _orderId) 
        external 
        view 
        orderExists(_orderId) 
        returns (
            bool disputeOpened,
            string memory disputeReason,
            bool disputeResolved,
            address disputeOpener,
            address disputeWinner,
            uint256 disputeOpenedAt,
            uint256 disputeResolvedAt,
            string memory disputeResolutionDetail,
            RideStatus rideStatus
        ) 
    {
        Order storage o = orders[_orderId];
        return (
            o.disputeOpened,
            o.disputeReason,
            o.disputeResolved,
            o.disputeOpener,
            o.disputeWinner,
            o.disputeOpenedAt,
            o.disputeResolvedAt,
            o.disputeResolutionDetail,
            o.rideStatus
        );
    }
    
    /**
     * @dev 手动触发结算（在争议窗口期后或争议已解决后）
     * @param _orderId 订单ID
     */
    function settle(uint256 _orderId) external orderExists(_orderId) {
        Order storage o = orders[_orderId];
        
        // 检查是否在等待结算状态
        require(
            o.rideStatus == RideStatus.AWAITING_SETTLEMENT,
            "Order not ready to settle"
        );
        
        // 如果存在争议但未解决，禁止结算
        require(
            !o.disputeOpened || (o.disputeOpened && o.disputeResolved),
            "Dispute not resolved"
        );
        
        // 结算逻辑：
        // 1. 如果没有争议，允许立即结算（不需要等待争议窗口关闭，因为 completeOrder 已经完成了验证）
        // 2. 如果争议已解决，可以结算
        // 3. 如果存在未解决的争议，禁止结算（已在上面检查）
        // 注意：completeOrder 函数在没有争议时会立即调用 _settleOrder，所以这里也允许立即结算
        
        // 执行结算
        _settleOrder(_orderId);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

