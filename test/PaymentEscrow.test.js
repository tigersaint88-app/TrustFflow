const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustFlowEscrow", function () {
    let paymentEscrow;
    let owner, platformWallet, passenger, driver;
    
    beforeEach(async function () {
        [owner, platformWallet, passenger, driver] = await ethers.getSigners();
        
        const TrustFlowEscrow = await ethers.getContractFactory("TrustFlowEscrow");
        paymentEscrow = await TrustFlowEscrow.deploy(platformWallet.address);
        await paymentEscrow.deployed();
    });
    
    describe("部署", function () {
        it("应该正确设置平台钱包地址", async function () {
            expect(await paymentEscrow.platformWallet()).to.equal(platformWallet.address);
        });
        
        it("应该设置默认手续费率为5%", async function () {
            expect(await paymentEscrow.platformFeeRate()).to.equal(5);
        });
    });
    
    describe("创建订单", function () {
        it("应该成功创建订单并锁定资金", async function () {
            const orderValue = ethers.utils.parseEther("1.0");
            
            await expect(
                paymentEscrow.connect(passenger).createOrder(driver.address, {
                    value: orderValue
                })
            ).to.emit(paymentEscrow, "OrderCreated")
             .and.to.emit(paymentEscrow, "PaymentLocked");
            
            const order = await paymentEscrow.orders(0);
            expect(order.passenger).to.equal(passenger.address);
            expect(order.driver).to.equal(driver.address);
            expect(order.amount).to.equal(orderValue);
            expect(order.status).to.equal(1); // Locked
        });
        
        it("应该拒绝零金额订单", async function () {
            await expect(
                paymentEscrow.connect(passenger).createOrder(driver.address, {
                    value: 0
                })
            ).to.be.revertedWith("Payment amount must be greater than 0");
        });
        
        it("应该拒绝无效的司机地址", async function () {
            await expect(
                paymentEscrow.connect(passenger).createOrder(ethers.constants.AddressZero, {
                    value: ethers.utils.parseEther("1.0")
                })
            ).to.be.revertedWith("Invalid driver address");
        });
    });
    
    describe("完成订单", function () {
        let orderId;
        const orderValue = ethers.utils.parseEther("1.0");
        
        beforeEach(async function () {
            const tx = await paymentEscrow.connect(passenger).createOrder(driver.address, {
                value: orderValue
            });
            const receipt = await tx.wait();
            orderId = receipt.events[0].args.orderId;
            
            // 开始行程
            await paymentEscrow.connect(driver).startRide(orderId);
        });
        
        it("应该正确完成订单并分配资金", async function () {
            const driverBalanceBefore = await ethers.provider.getBalance(driver.address);
            const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);
            
            await expect(
                paymentEscrow.connect(driver).completeOrder(orderId)
            ).to.emit(paymentEscrow, "PaymentReleased");
            
            const driverBalanceAfter = await ethers.provider.getBalance(driver.address);
            const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);
            
            // 司机应该收到95%的资金（扣除5%手续费）
            const expectedDriverPayment = orderValue.mul(95).div(100);
            const expectedPlatformFee = orderValue.mul(5).div(100);
            
            // 考虑gas费用，司机余额增加应该接近预期值
            expect(driverBalanceAfter).to.be.gt(driverBalanceBefore);
            
            // 平台应该收到5%的手续费
            expect(platformBalanceAfter.sub(platformBalanceBefore)).to.equal(expectedPlatformFee);
        });
    });
    
    describe("取消订单", function () {
        let orderId;
        const orderValue = ethers.utils.parseEther("1.0");
        
        beforeEach(async function () {
            const tx = await paymentEscrow.connect(passenger).createOrder(driver.address, {
                value: orderValue
            });
            const receipt = await tx.wait();
            orderId = receipt.events[0].args.orderId;
        });
        
        it("应该允许乘客取消订单并退款", async function () {
            const passengerBalanceBefore = await ethers.provider.getBalance(passenger.address);
            
            await expect(
                paymentEscrow.connect(passenger).cancelOrder(orderId)
            ).to.emit(paymentEscrow, "OrderCancelled");
            
            const passengerBalanceAfter = await ethers.provider.getBalance(passenger.address);
            
            // 乘客应该收到退款（扣除gas费用后应该接近原金额）
            expect(passengerBalanceAfter).to.be.gt(passengerBalanceBefore);
        });
    });
    
    describe("争议处理", function () {
        let orderId;
        const orderValue = ethers.utils.parseEther("1.0");
        
        beforeEach(async function () {
            const tx = await paymentEscrow.connect(passenger).createOrder(driver.address, {
                value: orderValue
            });
            const receipt = await tx.wait();
            orderId = receipt.events[0].args.orderId;
            
            await paymentEscrow.connect(driver).startRide(orderId);
        });
        
        it("应该允许提出争议", async function () {
            await expect(
                paymentEscrow.connect(passenger).raiseDispute(orderId)
            ).to.emit(paymentEscrow, "DisputeRaised");
            
            const order = await paymentEscrow.orders(orderId);
            expect(order.status).to.equal(5); // Disputed
        });
        
        it("应该允许管理员解决争议", async function () {
            await paymentEscrow.connect(passenger).raiseDispute(orderId);
            
            const passengerRefund = orderValue.div(2);
            const driverPayment = orderValue.div(2);
            const platformFee = orderValue.mul(5).div(100);
            
            await expect(
                paymentEscrow.resolveDispute(
                    orderId,
                    passenger.address,
                    passengerRefund.sub(platformFee.div(2)),
                    driverPayment.sub(platformFee.div(2))
                )
            ).to.emit(paymentEscrow, "DisputeResolved");
        });
    });
    
    describe("管理功能", function () {
        it("应该允许所有者更新手续费率", async function () {
            await paymentEscrow.updatePlatformFeeRate(10);
            expect(await paymentEscrow.platformFeeRate()).to.equal(10);
        });
        
        it("应该拒绝过高的手续费率", async function () {
            await expect(
                paymentEscrow.updatePlatformFeeRate(25)
            ).to.be.revertedWith("Fee rate too high");
        });
        
        it("应该允许所有者暂停合约", async function () {
            await paymentEscrow.pause();
            
            await expect(
                paymentEscrow.connect(passenger).createOrder(driver.address, {
                    value: ethers.utils.parseEther("1.0")
                })
            ).to.be.revertedWith("Pausable: paused");
        });
    });
});







