// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustFlowUserRegistry
 * @dev 用户管理合约 - 管理司机和乘客的注册、验证和信用评分
 */
contract TrustFlowUserRegistry is Ownable {
    
    // 用户类型
    enum UserType {
        None,
        Passenger,
        Driver,
        Both
    }
    
    // 验证状态
    enum VerificationStatus {
        Unverified,
        Pending,
        Verified,
        Rejected
    }
    
    // 用户信息
    struct User {
        address userAddress;
        UserType userType;
        string name;
        string phoneHash;           // 电话号码哈希（隐私保护）
        VerificationStatus kycStatus;
        uint256 creditScore;        // 信用分（0-1000）
        uint256 totalRides;         // 总行程数
        bool isBlacklisted;         // 是否在黑名单
        uint256 registeredAt;       // 注册时间
        string ipfsProfile;         // IPFS存储的详细资料
    }
    
    // 司机额外信息
    struct DriverInfo {
        string licenseHash;         // 驾照哈希
        string vehiclePlate;        // 车牌号
        string vehicleModel;        // 车型
        bool isActive;              // 是否在线
        uint256 totalEarnings;      // 总收入
    }
    
    // 状态变量
    mapping(address => User) public users;
    mapping(address => DriverInfo) public drivers;
    mapping(address => bool) public verifiers;      // 授权的验证者
    address[] public userList;
    
    // 常量
    uint256 public constant INITIAL_CREDIT_SCORE = 500;
    uint256 public constant MAX_CREDIT_SCORE = 1000;
    uint256 public constant MIN_CREDIT_SCORE = 0;
    
    // 事件
    event UserRegistered(address indexed user, UserType userType, uint256 timestamp);
    event DriverRegistered(address indexed driver, string vehiclePlate);
    event KYCStatusUpdated(address indexed user, VerificationStatus status);
    event CreditScoreUpdated(address indexed user, uint256 newScore);
    event UserBlacklisted(address indexed user, string reason);
    event UserRemovedFromBlacklist(address indexed user);
    event RideCountUpdated(address indexed user, uint256 totalRides);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    // 修饰符
    modifier onlyVerifier() {
        require(verifiers[msg.sender] || msg.sender == owner(), "Not authorized verifier");
        _;
    }
    
    modifier userExists(address _user) {
        require(users[_user].userAddress != address(0), "User not registered");
        _;
    }
    
    modifier notBlacklisted(address _user) {
        require(!users[_user].isBlacklisted, "User is blacklisted");
        _;
    }
    
    /**
     * @dev 注册为乘客
     * @param _name 姓名
     * @param _phoneHash 电话号码哈希
     */
    function registerPassenger(string memory _name, string memory _phoneHash) external {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = User({
            userAddress: msg.sender,
            userType: UserType.Passenger,
            name: _name,
            phoneHash: _phoneHash,
            kycStatus: VerificationStatus.Unverified,
            creditScore: INITIAL_CREDIT_SCORE,
            totalRides: 0,
            isBlacklisted: false,
            registeredAt: block.timestamp,
            ipfsProfile: ""
        });
        
        userList.push(msg.sender);
        
        emit UserRegistered(msg.sender, UserType.Passenger, block.timestamp);
    }
    
    /**
     * @dev 注册为司机
     * @param _name 姓名
     * @param _phoneHash 电话号码哈希
     * @param _licenseHash 驾照哈希
     * @param _vehiclePlate 车牌号
     * @param _vehicleModel 车型
     */
    function registerDriver(
        string memory _name,
        string memory _phoneHash,
        string memory _licenseHash,
        string memory _vehiclePlate,
        string memory _vehicleModel
    ) external {
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = User({
            userAddress: msg.sender,
            userType: UserType.Driver,
            name: _name,
            phoneHash: _phoneHash,
            kycStatus: VerificationStatus.Pending,
            creditScore: INITIAL_CREDIT_SCORE,
            totalRides: 0,
            isBlacklisted: false,
            registeredAt: block.timestamp,
            ipfsProfile: ""
        });
        
        drivers[msg.sender] = DriverInfo({
            licenseHash: _licenseHash,
            vehiclePlate: _vehiclePlate,
            vehicleModel: _vehicleModel,
            isActive: false,
            totalEarnings: 0
        });
        
        userList.push(msg.sender);
        
        emit UserRegistered(msg.sender, UserType.Driver, block.timestamp);
        emit DriverRegistered(msg.sender, _vehiclePlate);
    }
    
    /**
     * @dev 更新KYC状态
     * @param _user 用户地址
     * @param _status 新状态
     */
    function updateKYCStatus(address _user, VerificationStatus _status) 
        external 
        onlyVerifier 
        userExists(_user) 
    {
        users[_user].kycStatus = _status;
        emit KYCStatusUpdated(_user, _status);
    }
    
    /**
     * @dev 更新信用分
     * @param _user 用户地址
     * @param _scoreChange 分数变化（可正可负）
     */
    function updateCreditScore(address _user, int256 _scoreChange) 
        external 
        onlyVerifier 
        userExists(_user) 
    {
        User storage user = users[_user];
        
        int256 newScore = int256(user.creditScore) + _scoreChange;
        
        if (newScore > int256(MAX_CREDIT_SCORE)) {
            newScore = int256(MAX_CREDIT_SCORE);
        } else if (newScore < int256(MIN_CREDIT_SCORE)) {
            newScore = int256(MIN_CREDIT_SCORE);
        }
        
        user.creditScore = uint256(newScore);
        
        emit CreditScoreUpdated(_user, user.creditScore);
    }
    
    /**
     * @dev 增加行程计数
     * @param _user 用户地址
     */
    function incrementRideCount(address _user) external onlyVerifier userExists(_user) {
        users[_user].totalRides++;
        emit RideCountUpdated(_user, users[_user].totalRides);
    }
    
    /**
     * @dev 添加到黑名单
     * @param _user 用户地址
     * @param _reason 原因
     */
    function addToBlacklist(address _user, string memory _reason) 
        external 
        onlyOwner 
        userExists(_user) 
    {
        users[_user].isBlacklisted = true;
        emit UserBlacklisted(_user, _reason);
    }
    
    /**
     * @dev 从黑名单移除
     * @param _user 用户地址
     */
    function removeFromBlacklist(address _user) external onlyOwner userExists(_user) {
        users[_user].isBlacklisted = false;
        emit UserRemovedFromBlacklist(_user);
    }
    
    /**
     * @dev 司机上线/下线
     * @param _isActive 是否在线
     */
    function setDriverActive(bool _isActive) external userExists(msg.sender) {
        require(
            users[msg.sender].userType == UserType.Driver || 
            users[msg.sender].userType == UserType.Both,
            "Not a driver"
        );
        drivers[msg.sender].isActive = _isActive;
    }
    
    /**
     * @dev 更新司机收入
     * @param _driver 司机地址
     * @param _amount 金额
     */
    function updateDriverEarnings(address _driver, uint256 _amount) 
        external 
        onlyVerifier 
        userExists(_driver) 
    {
        drivers[_driver].totalEarnings += _amount;
    }
    
    /**
     * @dev 更新用户IPFS资料
     * @param _ipfsHash IPFS哈希
     */
    function updateUserProfile(string memory _ipfsHash) external userExists(msg.sender) {
        users[msg.sender].ipfsProfile = _ipfsHash;
    }
    
    /**
     * @dev 添加验证者
     * @param _verifier 验证者地址
     */
    function addVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid address");
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    /**
     * @dev 移除验证者
     * @param _verifier 验证者地址
     */
    function removeVerifier(address _verifier) external onlyOwner {
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    /**
     * @dev 获取用户信息
     * @param _user 用户地址
     */
    function getUser(address _user) external view returns (User memory) {
        return users[_user];
    }
    
    /**
     * @dev 获取司机信息
     * @param _driver 司机地址
     */
    function getDriverInfo(address _driver) external view returns (DriverInfo memory) {
        return drivers[_driver];
    }
    
    /**
     * @dev 检查用户是否可以使用服务
     * @param _user 用户地址
     */
    function isUserEligible(address _user) external view returns (bool) {
        User memory user = users[_user];
        return user.userAddress != address(0) && 
               !user.isBlacklisted && 
               user.creditScore >= 200;
    }
    
    /**
     * @dev 检查司机是否可以接单
     * @param _driver 司机地址
     */
    function isDriverEligible(address _driver) external view returns (bool) {
        User memory user = users[_driver];
        DriverInfo memory driverInfo = drivers[_driver];
        
        return user.userAddress != address(0) &&
               !user.isBlacklisted &&
               user.kycStatus == VerificationStatus.Verified &&
               driverInfo.isActive &&
               user.creditScore >= 300;
    }
    
    /**
     * @dev 获取所有用户数量
     */
    function getUserCount() external view returns (uint256) {
        return userList.length;
    }
}

