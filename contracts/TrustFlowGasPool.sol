// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TrustFlowGasPool
 * @dev Gas 资金池合约 - 管理平台 gas 费用资金池
 * 用于代付用户交易 gas 费用，资金来源于订单费用中的 gas 补偿
 */
contract TrustFlowGasPool is Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    IERC20 public usdcToken;          // USDC 代币合约地址
    address public escrowContract;    // TrustFlowEscrow 合约地址
    
    // 统计信息
    uint256 public totalDeposited;    // 总存入的 USDC 金额
    uint256 public totalWithdrawn;    // 总提取的金额（用于支付 gas）
    
    // 事件
    event GasCompensationDeposited(address indexed from, uint256 amount, uint256 orderId);
    event GasPoolWithdrawn(address indexed to, uint256 amount, string reason);
    event EscrowContractUpdated(address indexed oldEscrow, address indexed newEscrow);
    
    // 修饰符
    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow contract can call");
        _;
    }
    
    constructor(address _usdcToken, address _escrowContract) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        require(_escrowContract != address(0), "Invalid escrow contract address");
        usdcToken = IERC20(_usdcToken);
        escrowContract = _escrowContract;
    }
    
    /**
     * @dev 记录 gas 补偿存入（由 Escrow 合约调用，USDC 已通过 transfer 转入）
     * @param _amount USDC 金额
     * @param _orderId 订单ID（用于追踪）
     */
    function recordGasCompensation(uint256 _amount, uint256 _orderId) external onlyEscrow whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        
        totalDeposited += _amount;
        
        emit GasCompensationDeposited(escrowContract, _amount, _orderId);
    }
    
    /**
     * @dev 存入 gas 补偿（兼容旧版本，使用 transferFrom）
     * @param _amount USDC 金额
     * @param _orderId 订单ID（用于追踪）
     */
    function depositGasCompensation(uint256 _amount, uint256 _orderId) external onlyEscrow whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        
        // 从 Escrow 合约转账 USDC 到 GasPool
        usdcToken.safeTransferFrom(escrowContract, address(this), _amount);
        
        totalDeposited += _amount;
        
        emit GasCompensationDeposited(escrowContract, _amount, _orderId);
    }
    
    /**
     * @dev 提取 gas 池资金（用于平台兑换为 ETH/MATIC 支付 gas）
     * @param _to 接收地址
     * @param _amount 提取金额
     * @param _reason 提取原因（用于审计）
     */
    function withdrawGasPool(address _to, uint256 _amount, string memory _reason) external onlyOwner {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        require(usdcToken.balanceOf(address(this)) >= _amount, "Insufficient balance");
        
        usdcToken.safeTransfer(_to, _amount);
        totalWithdrawn += _amount;
        
        emit GasPoolWithdrawn(_to, _amount, _reason);
    }
    
    /**
     * @dev 更新 Escrow 合约地址
     * @param _newEscrow 新的 Escrow 合约地址
     */
    function updateEscrowContract(address _newEscrow) external onlyOwner {
        require(_newEscrow != address(0), "Invalid escrow contract address");
        address oldEscrow = escrowContract;
        escrowContract = _newEscrow;
        emit EscrowContractUpdated(oldEscrow, _newEscrow);
    }
    
    /**
     * @dev 获取 gas 池余额
     * @return 当前 USDC 余额
     */
    function getGasPoolBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
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
     * @dev 紧急提取所有资金（仅在紧急情况下使用）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        if (balance > 0) {
            usdcToken.safeTransfer(owner(), balance);
        }
    }
}

