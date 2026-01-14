// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDCTestToken
 * @dev USDC 测试代币合约 - 用于本地测试环境
 * USDC 使用 6 位小数（标准 USDC 精度）
 */
contract USDCTestToken is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    
    /**
     * @dev 构造函数
     * @param initialSupply 初始供应量（实际数量，合约会自动乘以 10^6）
     */
    constructor(uint256 initialSupply) ERC20("USD Coin (Test)", "USDC") {
        // 初始供应量转换为 6 位小数
        uint256 totalSupply = initialSupply * 10**DECIMALS;
        _mint(msg.sender, totalSupply);
    }
    
    /**
     * @dev 返回代币精度（6 位小数，与真实 USDC 一致）
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev 铸造代币（仅所有者）
     * @param to 接收地址
     * @param amount 数量（实际数量，会自动乘以 10^6）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        uint256 amountWithDecimals = amount * 10**DECIMALS;
        _mint(to, amountWithDecimals);
    }
    
    /**
     * @dev 批量铸造代币（用于测试，给多个地址分配代币）
     * @param recipients 接收地址数组
     * @param amount 每个地址的数量（实际数量，会自动乘以 10^6）
     */
    function batchMint(address[] memory recipients, uint256 amount) external onlyOwner {
        uint256 amountWithDecimals = amount * 10**DECIMALS;
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amountWithDecimals);
        }
    }
}

