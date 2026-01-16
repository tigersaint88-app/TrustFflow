// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TrustFlowEscrow
 * @dev 支付托管合约 - 管理网约车订单的资金托管和释放（使用 ETH）
 */
contract TrustFlowEscrow is ReentrancyGuard, Ownable, Pausable {
    // 订单状态
    enum OrderStatus {
        Created,        // 已创建
        Locked,         // 资金已锁定
        InProgress,     // 进行中
        Completed,      // 已完成
        Cancelled,      // 已取消
        Disputed        // 争议中
    }
    
    // 订单结构
    struct Order {
        uint256 orderId;
        address passenger;      // 乘客地址
        address driver;         // 司机地址
        uint256 amount;         // 订单金额（ETH）
        uint256 platformFee;    // 平台手续费
        OrderStatus status;     // 订单状态
        uint256 createdAt;      // 创建时间
        uint256 completedAt;    // 完成时间
    }
    
    // 状态变量
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    uint256 public platformFeeRate = 5; // 5% 平台手续费
    address public platformWallet;      // 平台钱包地址
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed passenger, uint256 amount);
    event PaymentLocked(uint256 indexed orderId, address indexed passenger, uint256 amount);
    event PaymentReleased(uint256 indexed orderId, address indexed driver, uint256 amount, uint256 platformFee, address platformWallet);
    event OrderCancelled(uint256 indexed orderId, address indexed passenger, uint256 refundAmount);
    event DisputeRaised(uint256 indexed orderId, address indexed initiator);
    event DisputeResolved(uint256 indexed orderId, address winner, uint256 amount);
    event PlatformFeeRateUpdated(uint256 newRate);
    
    // 修饰符
    modifier onlyPassenger(uint256 _orderId) {
        require(orders[_orderId].passenger == msg.sender, "Only passenger can call this");
        _;
    }
    
    modifier onlyDriver(uint256 _orderId) {
        require(orders[_orderId].driver == msg.sender, "Only driver can call this");
        _;
    }
    
    modifier orderExists(uint256 _orderId) {
        require(_orderId < orderCount, "Order does not exist");
        _;
    }
    
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev 创建订单并锁定资金（使用 ETH）
     * @param _driver 司机地址
     */
    function createOrder(address _driver) external payable whenNotPaused nonReentrant returns (uint256) {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(_driver != address(0), "Invalid driver address");
        require(_driver != msg.sender, "Driver cannot be passenger");
        
        uint256 orderId = orderCount++;
        uint256 platformFee = (msg.value * platformFeeRate) / 100;
        
        orders[orderId] = Order({
            orderId: orderId,
            passenger: msg.sender,
            driver: _driver,
            amount: msg.value,
            platformFee: platformFee,
            status: OrderStatus.Locked,
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        emit OrderCreated(orderId, msg.sender, msg.value);
        emit PaymentLocked(orderId, msg.sender, msg.value);
        
        return orderId;
    }
    
    /**
     * @dev 开始行程
     * @param _orderId 订单ID
     */
    function startRide(uint256 _orderId) external orderExists(_orderId) onlyDriver(_orderId) {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.Locked, "Invalid order status");
        
        order.status = OrderStatus.InProgress;
    }
    
    /**
     * @dev 完成订单并释放资金（使用 ETH）
     * @param _orderId 订单ID
     */
    function completeOrder(uint256 _orderId) external orderExists(_orderId) onlyDriver(_orderId) nonReentrant {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.InProgress, "Order is not in progress");
        
        order.status = OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        uint256 driverPayment = order.amount - order.platformFee;
        
        // 转账 ETH 给司机
        payable(order.driver).transfer(driverPayment);
        
        // 转账 ETH 平台手续费
        payable(platformWallet).transfer(order.platformFee);
        
        emit PaymentReleased(_orderId, order.driver, driverPayment, order.platformFee, platformWallet);
    }
    
    /**
     * @dev 取消订单（仅在特定状态下可取消）
     * @param _orderId 订单ID
     */
    function cancelOrder(uint256 _orderId) external orderExists(_orderId) nonReentrant {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.passenger || msg.sender == order.driver,
            "Only passenger or driver can cancel"
        );
        require(
            order.status == OrderStatus.Locked || order.status == OrderStatus.Created,
            "Cannot cancel order in current status"
        );
        
        order.status = OrderStatus.Cancelled;
        
        // 退款 ETH 给乘客
        uint256 refundAmount = order.amount;
        payable(order.passenger).transfer(refundAmount);
        
        emit OrderCancelled(_orderId, order.passenger, refundAmount);
    }
    
    /**
     * @dev 提出争议
     * @param _orderId 订单ID
     */
    function raiseDispute(uint256 _orderId) external orderExists(_orderId) {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.passenger || msg.sender == order.driver,
            "Only passenger or driver can raise dispute"
        );
        require(
            order.status == OrderStatus.InProgress || order.status == OrderStatus.Completed,
            "Invalid order status for dispute"
        );
        
        order.status = OrderStatus.Disputed;
        
        emit DisputeRaised(_orderId, msg.sender);
    }
    
    /**
     * @dev 解决争议（仅管理员或仲裁合约）
     * @param _orderId 订单ID
     * @param _winner 胜诉方地址
     * @param _passengerAmount 乘客获得金额
     * @param _driverAmount 司机获得金额
     */
    function resolveDispute(
        uint256 _orderId,
        address _winner,
        uint256 _passengerAmount,
        uint256 _driverAmount
    ) external onlyOwner orderExists(_orderId) nonReentrant {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.Disputed, "Order is not in dispute");
        require(
            _passengerAmount + _driverAmount + order.platformFee <= order.amount,
            "Invalid distribution amounts"
        );
        
        order.status = OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        // 分配资金（ETH）
        if (_passengerAmount > 0) {
            payable(order.passenger).transfer(_passengerAmount);
        }
        
        if (_driverAmount > 0) {
            payable(order.driver).transfer(_driverAmount);
        }
        
        // 平台手续费
        payable(platformWallet).transfer(order.platformFee);
        
        emit DisputeResolved(_orderId, _winner, _passengerAmount + _driverAmount);
    }
    
    /**
     * @dev 更新平台手续费率
     * @param _newRate 新费率（百分比）
     */
    function updatePlatformFeeRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 20, "Fee rate too high"); // 最高20%
        platformFeeRate = _newRate;
        emit PlatformFeeRateUpdated(_newRate);
    }
    
    /**
     * @dev 更新平台钱包地址
     * @param _newWallet 新钱包地址
     */
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet address");
        platformWallet = _newWallet;
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
    
    /**
     * @dev 获取订单详情
     * @param _orderId 订单ID
     */
    function getOrderDetails(uint256 _orderId) external view orderExists(_orderId) returns (Order memory) {
        return orders[_orderId];
    }
    
    /**
     * @dev 紧急提款（仅在紧急情况下使用，提取 ETH）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}

