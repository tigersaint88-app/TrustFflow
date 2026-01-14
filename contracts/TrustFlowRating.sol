// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustFlowRating
 * @dev 评价系统合约 - 管理司机和乘客之间的双向评价
 */
contract TrustFlowRating is Ownable {
    
    // 评价结构
    struct Rating {
        uint256 orderId;
        address rater;              // 评价者
        address ratee;              // 被评价者
        uint8 score;                // 评分（1-5星）
        string comment;             // 评论
        uint256 timestamp;          // 评价时间
        string ipfsHash;            // IPFS存储的详细评价
    }
    
    // 用户评价统计
    struct UserRating {
        uint256 totalRatings;       // 总评价数
        uint256 totalScore;         // 总分数
        uint256 averageScore;       // 平均分（乘以100，如450表示4.5星）
        uint256 fiveStars;          // 5星数量
        uint256 fourStars;          // 4星数量
        uint256 threeStars;         // 3星数量
        uint256 twoStars;           // 2星数量
        uint256 oneStar;            // 1星数量
    }
    
    // 状态变量
    mapping(uint256 => mapping(address => bool)) public hasRated;      // 订单 => 用户 => 是否已评价
    mapping(uint256 => Rating[]) public orderRatings;                  // 订单的所有评价
    mapping(address => UserRating) public userRatings;                 // 用户的评价统计
    mapping(address => Rating[]) public receivedRatings;               // 用户收到的评价
    mapping(address => Rating[]) public givenRatings;                  // 用户给出的评价
    
    address public orderContract;                                       // 订单合约地址
    
    // 事件
    event RatingSubmitted(
        uint256 indexed orderId,
        address indexed rater,
        address indexed ratee,
        uint8 score,
        uint256 timestamp
    );
    event RatingUpdated(uint256 indexed orderId, address indexed rater, uint8 newScore);
    event IncentiveAwarded(address indexed user, uint256 amount);
    
    // 修饰符
    modifier onlyOrderContract() {
        require(msg.sender == orderContract || msg.sender == owner(), "Only order contract");
        _;
    }
    
    modifier validScore(uint8 _score) {
        require(_score >= 1 && _score <= 5, "Score must be between 1 and 5");
        _;
    }
    
    /**
     * @dev 设置订单合约地址
     * @param _orderContract 订单合约地址
     */
    function setOrderContract(address _orderContract) external onlyOwner {
        require(_orderContract != address(0), "Invalid address");
        orderContract = _orderContract;
    }
    
    /**
     * @dev 提交评价
     * @param _orderId 订单ID
     * @param _ratee 被评价者地址
     * @param _score 评分（1-5）
     * @param _comment 评论
     */
    function submitRating(
        uint256 _orderId,
        address _ratee,
        uint8 _score,
        string memory _comment
    ) external validScore(_score) {
        require(_ratee != address(0), "Invalid ratee address");
        require(_ratee != msg.sender, "Cannot rate yourself");
        require(!hasRated[_orderId][msg.sender], "Already rated this order");
        
        // 创建评价
        Rating memory newRating = Rating({
            orderId: _orderId,
            rater: msg.sender,
            ratee: _ratee,
            score: _score,
            comment: _comment,
            timestamp: block.timestamp,
            ipfsHash: ""
        });
        
        // 记录评价
        orderRatings[_orderId].push(newRating);
        receivedRatings[_ratee].push(newRating);
        givenRatings[msg.sender].push(newRating);
        hasRated[_orderId][msg.sender] = true;
        
        // 更新被评价者的统计数据
        _updateUserRating(_ratee, _score);
        
        emit RatingSubmitted(_orderId, msg.sender, _ratee, _score, block.timestamp);
    }
    
    /**
     * @dev 批量提交评价（用于双向评价）
     * @param _orderId 订单ID
     * @param _ratee 被评价者地址
     * @param _score 评分
     * @param _comment 评论
     * @param _ipfsHash IPFS哈希
     */
    function submitDetailedRating(
        uint256 _orderId,
        address _ratee,
        uint8 _score,
        string memory _comment,
        string memory _ipfsHash
    ) external validScore(_score) {
        require(_ratee != address(0), "Invalid ratee address");
        require(_ratee != msg.sender, "Cannot rate yourself");
        require(!hasRated[_orderId][msg.sender], "Already rated this order");
        
        Rating memory newRating = Rating({
            orderId: _orderId,
            rater: msg.sender,
            ratee: _ratee,
            score: _score,
            comment: _comment,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash
        });
        
        orderRatings[_orderId].push(newRating);
        receivedRatings[_ratee].push(newRating);
        givenRatings[msg.sender].push(newRating);
        hasRated[_orderId][msg.sender] = true;
        
        _updateUserRating(_ratee, _score);
        
        emit RatingSubmitted(_orderId, msg.sender, _ratee, _score, block.timestamp);
    }
    
    /**
     * @dev 内部函数：更新用户评价统计
     * @param _user 用户地址
     * @param _score 新评分
     */
    function _updateUserRating(address _user, uint8 _score) internal {
        UserRating storage rating = userRatings[_user];
        
        rating.totalRatings++;
        rating.totalScore += _score;
        rating.averageScore = (rating.totalScore * 100) / rating.totalRatings;
        
        // 更新星级分布
        if (_score == 5) rating.fiveStars++;
        else if (_score == 4) rating.fourStars++;
        else if (_score == 3) rating.threeStars++;
        else if (_score == 2) rating.twoStars++;
        else if (_score == 1) rating.oneStar++;
    }
    
    /**
     * @dev 获取订单的所有评价
     * @param _orderId 订单ID
     */
    function getOrderRatings(uint256 _orderId) external view returns (Rating[] memory) {
        return orderRatings[_orderId];
    }
    
    /**
     * @dev 获取用户收到的评价
     * @param _user 用户地址
     */
    function getReceivedRatings(address _user) external view returns (Rating[] memory) {
        return receivedRatings[_user];
    }
    
    /**
     * @dev 获取用户给出的评价
     * @param _user 用户地址
     */
    function getGivenRatings(address _user) external view returns (Rating[] memory) {
        return givenRatings[_user];
    }
    
    /**
     * @dev 获取用户评价统计
     * @param _user 用户地址
     */
    function getUserRating(address _user) external view returns (UserRating memory) {
        return userRatings[_user];
    }
    
    /**
     * @dev 获取用户平均评分
     * @param _user 用户地址
     */
    function getAverageScore(address _user) external view returns (uint256) {
        return userRatings[_user].averageScore;
    }
    
    /**
     * @dev 检查订单是否已被用户评价
     * @param _orderId 订单ID
     * @param _user 用户地址
     */
    function hasUserRated(uint256 _orderId, address _user) external view returns (bool) {
        return hasRated[_orderId][_user];
    }
    
    /**
     * @dev 获取用户总评价数
     * @param _user 用户地址
     */
    function getTotalRatings(address _user) external view returns (uint256) {
        return userRatings[_user].totalRatings;
    }
    
    /**
     * @dev 获取星级分布
     * @param _user 用户地址
     */
    function getStarDistribution(address _user) external view returns (
        uint256 five,
        uint256 four,
        uint256 three,
        uint256 two,
        uint256 one
    ) {
        UserRating memory rating = userRatings[_user];
        return (
            rating.fiveStars,
            rating.fourStars,
            rating.threeStars,
            rating.twoStars,
            rating.oneStar
        );
    }
    
    /**
     * @dev 计算用户是否为优质用户（平均4星以上且评价超过10次）
     * @param _user 用户地址
     */
    function isPremiumUser(address _user) external view returns (bool) {
        UserRating memory rating = userRatings[_user];
        return rating.totalRatings >= 10 && rating.averageScore >= 400;
    }
}

