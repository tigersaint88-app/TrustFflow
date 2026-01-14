#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从部署文件更新 .env 文件
"""

import json
import os
import re
from datetime import datetime

def update_env_file():
    """从 deployments/localhost-latest.json 更新 .env 文件"""
    deployment_file = 'deployments/localhost-latest.json'
    env_file = '.env'
    
    # 读取部署信息
    try:
        with open(deployment_file, 'r', encoding='utf-8') as f:
            deployment = json.load(f)
    except FileNotFoundError:
        print(f'❌ 未找到部署文件: {deployment_file}')
        return False
    
    contracts = deployment['contracts']
    config = deployment.get('configuration', {})
    
    # 读取现有的 .env 文件（如果存在）
    env_vars = {}
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    # 更新合约地址
    env_vars['RIDE_ORDER_ADDRESS'] = contracts.get('rideOrder', '')
    env_vars['PAYMENT_ESCROW_ADDRESS'] = contracts.get('paymentEscrow', '')
    env_vars['USER_REGISTRY_ADDRESS'] = contracts.get('userRegistry', '')
    env_vars['RATING_SYSTEM_ADDRESS'] = contracts.get('ratingSystem', '')
    env_vars['DISPUTE_RESOLUTION_ADDRESS'] = contracts.get('disputeResolution', '')
    env_vars['PLATFORM_WALLET'] = config.get('platformWallet', '')
    
    # 保留其他重要的环境变量
    if 'RPC_URL' not in env_vars:
        env_vars['RPC_URL'] = 'http://127.0.0.1:8545'
    if 'CHAIN_ID' not in env_vars:
        env_vars['CHAIN_ID'] = '1337'
    if 'PLATFORM_FEE_RATE' not in env_vars:
        env_vars['PLATFORM_FEE_RATE'] = '5'
    
    # 写入 .env 文件
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write('# 环境变量配置文件\n')
        f.write(f'# 自动更新于: {datetime.now().isoformat()}\n')
        f.write('# ETH Mode - 使用原生 ETH 进行支付\n\n')
        f.write('# ==================== 区块链配置 ====================\n')
        f.write(f"RPC_URL={env_vars.get('RPC_URL', 'http://127.0.0.1:8545')}\n")
        f.write(f"CHAIN_ID={env_vars.get('CHAIN_ID', '1337')}\n\n")
        f.write('# ==================== 合约地址 (ETH 模式) ====================\n')
        f.write(f"PAYMENT_ESCROW_ADDRESS={env_vars['PAYMENT_ESCROW_ADDRESS']}\n")
        f.write(f"RIDE_ORDER_ADDRESS={env_vars['RIDE_ORDER_ADDRESS']}\n")
        f.write(f"USER_REGISTRY_ADDRESS={env_vars['USER_REGISTRY_ADDRESS']}\n")
        f.write(f"RATING_SYSTEM_ADDRESS={env_vars['RATING_SYSTEM_ADDRESS']}\n")
        f.write(f"DISPUTE_RESOLUTION_ADDRESS={env_vars['DISPUTE_RESOLUTION_ADDRESS']}\n\n")
        f.write('# ==================== 平台配置 ====================\n')
        f.write(f"PLATFORM_WALLET={env_vars['PLATFORM_WALLET']}\n")
        f.write(f"PLATFORM_FEE_RATE={env_vars.get('PLATFORM_FEE_RATE', '5')}\n")
    
    print('✓ .env 文件已更新')
    print(f'\n更新的合约地址:')
    print(f'  RIDE_ORDER_ADDRESS: {env_vars["RIDE_ORDER_ADDRESS"]}')
    print(f'  PAYMENT_ESCROW_ADDRESS: {env_vars["PAYMENT_ESCROW_ADDRESS"]}')
    print(f'  USER_REGISTRY_ADDRESS: {env_vars["USER_REGISTRY_ADDRESS"]}')
    print(f'  RATING_SYSTEM_ADDRESS: {env_vars["RATING_SYSTEM_ADDRESS"]}')
    print(f'  DISPUTE_RESOLUTION_ADDRESS: {env_vars["DISPUTE_RESOLUTION_ADDRESS"]}')
    
    return True

if __name__ == '__main__':
    success = update_env_file()
    exit(0 if success else 1)

