/**
 * 验证部署并同步.env文件
 * 用于start-dev.bat脚本
 */

const fs = require('fs');
const path = require('path');
const hre = require('hardhat');
const { ethers } = hre;

const ROOT_DIR = path.join(__dirname, '..');
const DEPLOYMENT_FILE = path.join(ROOT_DIR, 'deployments', 'localhost-latest.json');
const ENV_FILE = path.join(ROOT_DIR, '.env');

async function verifyContracts() {
    try {
        if (!fs.existsSync(DEPLOYMENT_FILE)) {
            console.log('  ⚠ No deployment file found');
            return { success: false, reason: 'no_deployment_file' };
        }

        const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8'));
        const contracts = deployment.contracts;
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');

        let allDeployed = true;
        const issues = [];

        for (const [name, address] of Object.entries(contracts)) {
            if (address) {
                try {
                    const code = await provider.getCode(address);
                    if (code === '0x') {
                        issues.push(`${name} not deployed at ${address}`);
                        allDeployed = false;
                    }
                } catch (error) {
                    if (error.code === 'ECONNREFUSED') {
                        return { success: false, reason: 'node_not_running' };
                    }
                    issues.push(`${name} check failed: ${error.message}`);
                    allDeployed = false;
                }
            }
        }

        if (allDeployed) {
            console.log('  ✓ All contracts are deployed');
            return { success: true, deployment };
        } else {
            console.log('  ✗ Some contracts are not deployed:');
            issues.forEach(issue => console.log(`    - ${issue}`));
            return { success: false, reason: 'contracts_not_deployed', issues };
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('  ⚠ Cannot connect to Hardhat node (may not be running)');
            return { success: false, reason: 'node_not_running' };
        }
        console.error('  ✗ Error:', error.message);
        return { success: false, reason: 'error', error: error.message };
    }
}

async function syncEnvFile(deployment) {
    try {
        const contracts = deployment.contracts;
        let envContent = '';

        if (fs.existsSync(ENV_FILE)) {
            envContent = fs.readFileSync(ENV_FILE, 'utf8');
        }

        const contractVars = {
            'PAYMENT_ESCROW_ADDRESS': contracts.paymentEscrow,
            'RIDE_ORDER_ADDRESS': contracts.rideOrder,
            'USER_REGISTRY_ADDRESS': contracts.userRegistry,
            'RATING_SYSTEM_ADDRESS': contracts.ratingSystem,
            'DISPUTE_RESOLUTION_ADDRESS': contracts.disputeResolution
        };

        let updated = false;
        let lines = envContent.split('\n');
        const updatedLines = [];
        const existingVars = new Set();

        // 处理现有行
        for (let line of lines) {
            let modified = false;
            for (const [varName, varValue] of Object.entries(contractVars)) {
                const regex = new RegExp(`^\\s*${varName}\\s*=\\s*.*$`);
                if (regex.test(line)) {
                    const commentMatch = line.match(/(\s+#.*)$/);
                    const comment = commentMatch ? commentMatch[1] : '';
                    updatedLines.push(`${varName}=${varValue}${comment}`);
                    existingVars.add(varName);
                    modified = true;
                    updated = true;
                    break;
                }
            }
            if (!modified) {
                updatedLines.push(line);
            }
        }

        // 添加缺失的变量
        for (const [varName, varValue] of Object.entries(contractVars)) {
            if (!existingVars.has(varName)) {
                let insertIndex = updatedLines.length;
                for (let i = 0; i < updatedLines.length; i++) {
                    if (updatedLines[i].includes('合约地址') || updatedLines[i].includes('Contract Address')) {
                        for (let j = i + 1; j < updatedLines.length; j++) {
                            if (updatedLines[j].trim() === '' || 
                                (updatedLines[j].trim().startsWith('#') && updatedLines[j].includes('==='))) {
                                insertIndex = j;
                                break;
                            }
                        }
                        break;
                    }
                }
                updatedLines.splice(insertIndex, 0, `${varName}=${varValue}`);
                updated = true;
            }
        }

        if (updated) {
            fs.writeFileSync(ENV_FILE, updatedLines.join('\n'), 'utf8');
            console.log('  ✓ .env file synced with deployment addresses');
        } else {
            console.log('  ✓ .env file already up to date');
        }

        return { success: true, updated };
    } catch (error) {
        console.error('  ✗ Failed to sync .env:', error.message);
        return { success: false, error: error.message };
    }
}

async function verifyOrderId() {
    try {
        if (!fs.existsSync(DEPLOYMENT_FILE)) {
            return { success: false, reason: 'no_deployment_file' };
        }

        const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8'));
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const rideOrderAddress = deployment.contracts.rideOrder;

        const code = await provider.getCode(rideOrderAddress);
        if (code === '0x') {
            console.log('  ⚠ Contract not deployed, skipping order ID check');
            return { success: false, reason: 'contract_not_deployed' };
        }

        const TrustFlowRide = await ethers.getContractFactory('TrustFlowRide');
        const rideOrder = TrustFlowRide.attach(rideOrderAddress);
        const orderCount = await rideOrder.orderCount();
        const expectedOrderId = parseInt(process.env.INITIAL_ORDER_ID || '10000');

        if (orderCount.toString() === expectedOrderId.toString()) {
            console.log(`  ✓ Initial order ID is set correctly: ${expectedOrderId}`);
            return { success: true, orderCount: orderCount.toString(), expected: expectedOrderId.toString() };
        } else {
            console.log(`  ⚠ Order count mismatch: expected ${expectedOrderId}, got ${orderCount.toString()}`);
            console.log('  Run: npm run refresh:all to reset');
            return { success: false, orderCount: orderCount.toString(), expected: expectedOrderId.toString() };
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('  ⚠ Cannot verify (node not ready yet)');
            return { success: false, reason: 'node_not_running' };
        }
        console.log(`  ⚠ Verification failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    const command = process.argv[2] || 'verify';

    if (command === 'verify') {
        const result = await verifyContracts();
        if (result.success && result.deployment) {
            await syncEnvFile(result.deployment);
        }
        process.exit(result.success ? 0 : 1);
    } else if (command === 'sync') {
        if (!fs.existsSync(DEPLOYMENT_FILE)) {
            console.error('No deployment file found');
            process.exit(1);
        }
        const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8'));
        const result = await syncEnvFile(deployment);
        process.exit(result.success ? 0 : 1);
    } else if (command === 'orderid') {
        const result = await verifyOrderId();
        process.exit(result.success ? 0 : 1);
    } else {
        console.error('Unknown command:', command);
        console.error('Usage: node verify-and-sync-deployment.js [verify|sync|orderid]');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { verifyContracts, syncEnvFile, verifyOrderId };

