// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrustFlowDispute
 * @dev 争议处理合约 - 处理订单争议和仲裁
 */
contract TrustFlowDispute is AccessControl, ReentrancyGuard {
    
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    
    // 争议状态
    enum DisputeStatus {
        Open,           // 待处理
        UnderReview,    // 审查中
        Resolved,       // 已解决
        Closed          // 已关闭
    }
    
    // 争议类型
    enum DisputeType {
        PriceDispute,       // 价格争议
        ServiceQuality,     // 服务质量
        RouteDispute,       // 路线争议
        Safety,             // 安全问题
        Payment,            // 支付问题
        Other               // 其他
    }
    
    // 争议结果
    enum DisputeResult {
        Pending,            // 待定
        PassengerWins,      // 乘客胜诉
        DriverWins,         // 司机胜诉
        Split,              // 平分
        NoFault             // 无过错
    }
    
    // 证据结构
    struct Evidence {
        address submitter;
        string description;
        string ipfsHash;        // IPFS存储的证据（图片、视频等）
        uint256 timestamp;
    }
    
    // 争议结构
    struct Dispute {
        uint256 disputeId;
        uint256 orderId;
        address passenger;
        address driver;
        address initiator;          // 发起者
        DisputeType disputeType;
        DisputeStatus status;
        DisputeResult result;
        string description;
        Evidence[] evidences;       // 证据列表
        address assignedArbitrator; // 指派的仲裁员
        string resolution;          // 解决方案
        uint256 createdAt;
        uint256 resolvedAt;
        uint256 passengerRefund;    // 乘客退款金额
        uint256 driverPayment;      // 司机获得金额
    }
    
    // 仲裁员统计
    struct ArbitratorStats {
        uint256 totalCases;
        uint256 resolvedCases;
        uint256 averageResolutionTime;
    }
    
    // 状态变量
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256) public orderToDispute;     // 订单ID => 争议ID
    mapping(address => uint256[]) public userDisputes;     // 用户的争议列表
    mapping(address => ArbitratorStats) public arbitratorStats;
    uint256 public disputeCount;
    
    uint256 public constant MAX_RESOLUTION_TIME = 7 days;
    
    // 事件
    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed orderId,
        address indexed initiator,
        DisputeType disputeType
    );
    event EvidenceSubmitted(
        uint256 indexed disputeId,
        address indexed submitter,
        string ipfsHash
    );
    event ArbitratorAssigned(uint256 indexed disputeId, address indexed arbitrator);
    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeResult result,
        uint256 passengerRefund,
        uint256 driverPayment
    );
    event DisputeClosed(uint256 indexed disputeId);
    
    // 修饰符
    modifier disputeExists(uint256 _disputeId) {
        require(_disputeId < disputeCount, "Dispute does not exist");
        _;
    }
    
    modifier onlyDisputeParty(uint256 _disputeId) {
        Dispute storage dispute = disputes[_disputeId];
        require(
            msg.sender == dispute.passenger || msg.sender == dispute.driver,
            "Not a party to this dispute"
        );
        _;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, msg.sender);
    }
    
    /**
     * @dev 创建争议
     * @param _orderId 订单ID
     * @param _passenger 乘客地址
     * @param _driver 司机地址
     * @param _disputeType 争议类型
     * @param _description 描述
     */
    function createDispute(
        uint256 _orderId,
        address _passenger,
        address _driver,
        DisputeType _disputeType,
        string memory _description
    ) external returns (uint256) {
        require(msg.sender == _passenger || msg.sender == _driver, "Not authorized");
        require(orderToDispute[_orderId] == 0 || disputes[orderToDispute[_orderId]].status == DisputeStatus.Closed, 
                "Dispute already exists for this order");
        
        uint256 disputeId = disputeCount++;
        
        Dispute storage newDispute = disputes[disputeId];
        newDispute.disputeId = disputeId;
        newDispute.orderId = _orderId;
        newDispute.passenger = _passenger;
        newDispute.driver = _driver;
        newDispute.initiator = msg.sender;
        newDispute.disputeType = _disputeType;
        newDispute.status = DisputeStatus.Open;
        newDispute.result = DisputeResult.Pending;
        newDispute.description = _description;
        newDispute.createdAt = block.timestamp;
        newDispute.resolvedAt = 0;
        newDispute.passengerRefund = 0;
        newDispute.driverPayment = 0;
        
        orderToDispute[_orderId] = disputeId;
        userDisputes[_passenger].push(disputeId);
        userDisputes[_driver].push(disputeId);
        
        emit DisputeCreated(disputeId, _orderId, msg.sender, _disputeType);
        
        return disputeId;
    }
    
    /**
     * @dev 提交证据
     * @param _disputeId 争议ID
     * @param _description 证据描述
     * @param _ipfsHash IPFS哈希
     */
    function submitEvidence(
        uint256 _disputeId,
        string memory _description,
        string memory _ipfsHash
    ) external disputeExists(_disputeId) onlyDisputeParty(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.status != DisputeStatus.Resolved, "Dispute already resolved");
        
        Evidence memory newEvidence = Evidence({
            submitter: msg.sender,
            description: _description,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp
        });
        
        dispute.evidences.push(newEvidence);
        
        emit EvidenceSubmitted(_disputeId, msg.sender, _ipfsHash);
    }
    
    /**
     * @dev 指派仲裁员
     * @param _disputeId 争议ID
     * @param _arbitrator 仲裁员地址
     */
    function assignArbitrator(uint256 _disputeId, address _arbitrator) 
        external 
        disputeExists(_disputeId)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(hasRole(ARBITRATOR_ROLE, _arbitrator), "Not an arbitrator");
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.status == DisputeStatus.Open, "Dispute not open");
        
        dispute.assignedArbitrator = _arbitrator;
        dispute.status = DisputeStatus.UnderReview;
        
        arbitratorStats[_arbitrator].totalCases++;
        
        emit ArbitratorAssigned(_disputeId, _arbitrator);
    }
    
    /**
     * @dev 解决争议
     * @param _disputeId 争议ID
     * @param _result 争议结果
     * @param _passengerRefund 乘客退款金额
     * @param _driverPayment 司机获得金额
     * @param _resolution 解决方案说明
     */
    function resolveDispute(
        uint256 _disputeId,
        DisputeResult _result,
        uint256 _passengerRefund,
        uint256 _driverPayment,
        string memory _resolution
    ) external disputeExists(_disputeId) nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        require(
            msg.sender == dispute.assignedArbitrator || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(dispute.status == DisputeStatus.UnderReview, "Dispute not under review");
        
        dispute.status = DisputeStatus.Resolved;
        dispute.result = _result;
        dispute.passengerRefund = _passengerRefund;
        dispute.driverPayment = _driverPayment;
        dispute.resolution = _resolution;
        dispute.resolvedAt = block.timestamp;
        
        // 更新仲裁员统计
        address arbitrator = dispute.assignedArbitrator;
        arbitratorStats[arbitrator].resolvedCases++;
        
        uint256 resolutionTime = block.timestamp - dispute.createdAt;
        arbitratorStats[arbitrator].averageResolutionTime = 
            (arbitratorStats[arbitrator].averageResolutionTime * (arbitratorStats[arbitrator].resolvedCases - 1) + resolutionTime) 
            / arbitratorStats[arbitrator].resolvedCases;
        
        emit DisputeResolved(_disputeId, _result, _passengerRefund, _driverPayment);
    }
    
    /**
     * @dev 关闭争议
     * @param _disputeId 争议ID
     */
    function closeDispute(uint256 _disputeId) 
        external 
        disputeExists(_disputeId)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.status == DisputeStatus.Resolved, "Dispute not resolved");
        
        dispute.status = DisputeStatus.Closed;
        
        emit DisputeClosed(_disputeId);
    }
    
    /**
     * @dev 添加仲裁员
     * @param _arbitrator 仲裁员地址
     */
    function addArbitrator(address _arbitrator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ARBITRATOR_ROLE, _arbitrator);
    }
    
    /**
     * @dev 移除仲裁员
     * @param _arbitrator 仲裁员地址
     */
    function removeArbitrator(address _arbitrator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ARBITRATOR_ROLE, _arbitrator);
    }
    
    /**
     * @dev 获取争议详情
     * @param _disputeId 争议ID
     */
    function getDispute(uint256 _disputeId) 
        external 
        view 
        disputeExists(_disputeId) 
        returns (
            uint256 disputeId,
            uint256 orderId,
            address passenger,
            address driver,
            address initiator,
            DisputeType disputeType,
            DisputeStatus status,
            DisputeResult result,
            string memory description,
            uint256 createdAt
        ) 
    {
        Dispute storage dispute = disputes[_disputeId];
        return (
            dispute.disputeId,
            dispute.orderId,
            dispute.passenger,
            dispute.driver,
            dispute.initiator,
            dispute.disputeType,
            dispute.status,
            dispute.result,
            dispute.description,
            dispute.createdAt
        );
    }
    
    /**
     * @dev 获取争议的所有证据
     * @param _disputeId 争议ID
     */
    function getEvidences(uint256 _disputeId) 
        external 
        view 
        disputeExists(_disputeId) 
        returns (Evidence[] memory) 
    {
        return disputes[_disputeId].evidences;
    }
    
    /**
     * @dev 获取用户的争议列表
     * @param _user 用户地址
     */
    function getUserDisputes(address _user) external view returns (uint256[] memory) {
        return userDisputes[_user];
    }
    
    /**
     * @dev 获取仲裁员统计
     * @param _arbitrator 仲裁员地址
     */
    function getArbitratorStats(address _arbitrator) external view returns (ArbitratorStats memory) {
        return arbitratorStats[_arbitrator];
    }
}

