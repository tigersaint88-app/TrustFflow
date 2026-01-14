import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

// 导入合约ABI
import TrustFlowEscrowABI from '../../contracts/abi/TrustFlowEscrow.json';
import TrustFlowRideABI from '../../contracts/abi/TrustFlowRide.json';
import TrustFlowRatingABI from '../../contracts/abi/TrustFlowRating.json';
import TrustFlowUserRegistryABI from '../../contracts/abi/TrustFlowUserRegistry.json';

/**
 * 司机端主应用组件
 */
const TF_DriverApp = () => {
    // 状态管理
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contracts, setContracts] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    
    // 司机信息
    const [driverInfo, setDriverInfo] = useState(null);
    const [driverStats, setDriverStats] = useState({
        totalRides: 0,
        totalEarnings: 0,
        rating: 0,
    });
    
    // 订单相关状态
    const [availableOrders, setAvailableOrders] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);
    
    // 合约地址
    const CONTRACT_ADDRESSES = {
        paymentEscrow: process.env.REACT_APP_PAYMENT_ESCROW_ADDRESS,
        rideOrder: process.env.REACT_APP_RIDE_ORDER_ADDRESS,
        ratingSystem: process.env.REACT_APP_RATING_SYSTEM_ADDRESS,
        userRegistry: process.env.REACT_APP_USER_REGISTRY_ADDRESS,
    };
    
    /**
     * 连接钱包
     */
    const connectWallet = async () => {
        try {
            const web3Modal = new Web3Modal({
                network: 'polygon',
                cacheProvider: true,
                providerOptions: {},
                theme: "dark",
                title: "TrustFlow Wallet Connect"
            });
            
            const instance = await web3Modal.connect();
            const provider = new ethers.providers.Web3Provider(instance);
            const signer = provider.getSigner();
            const account = await signer.getAddress();
            
            setProvider(provider);
            setSigner(signer);
            setAccount(account);
            setIsConnected(true);
            
            // 初始化合约
            initializeContracts(signer);
            
            // 加载司机信息
            loadDriverInfo(account);
        } catch (error) {
            console.error('连接钱包失败:', error);
            alert('连接钱包失败，请重试');
        }
    };
    
    /**
     * 初始化合约实例
     */
    const initializeContracts = (signer) => {
        const paymentEscrow = new ethers.Contract(
            CONTRACT_ADDRESSES.paymentEscrow,
            TrustFlowEscrowABI,
            signer
        );
        
        const rideOrder = new ethers.Contract(
            CONTRACT_ADDRESSES.rideOrder,
            TrustFlowRideABI,
            signer
        );
        
        const ratingSystem = new ethers.Contract(
            CONTRACT_ADDRESSES.ratingSystem,
            TrustFlowRatingABI,
            signer
        );
        
        const userRegistry = new ethers.Contract(
            CONTRACT_ADDRESSES.userRegistry,
            TrustFlowUserRegistryABI,
            signer
        );
        
        setContracts({ paymentEscrow, rideOrder, ratingSystem, userRegistry });
    };
    
    /**
     * 加载司机信息
     */
    const loadDriverInfo = async (account) => {
        try {
            const user = await contracts.userRegistry.getUser(account);
            const driver = await contracts.userRegistry.getDriverInfo(account);
            const rating = await contracts.ratingSystem.getUserRating(account);
            
            setDriverInfo({ ...user, ...driver });
            setDriverStats({
                totalRides: user.totalRides.toNumber(),
                totalEarnings: ethers.utils.formatEther(driver.totalEarnings),
                rating: rating.averageScore.toNumber() / 100,
            });
            
            setIsOnline(driver.isActive);
        } catch (error) {
            console.error('加载司机信息失败:', error);
        }
    };
    
    /**
     * 切换在线状态
     */
    const toggleOnlineStatus = async () => {
        try {
            const tx = await contracts.userRegistry.setDriverActive(!isOnline);
            await tx.wait();
            
            setIsOnline(!isOnline);
            
            if (!isOnline) {
                // 上线后加载可用订单
                loadAvailableOrders();
                // 开始监听新订单
                listenForNewOrders();
            }
        } catch (error) {
            console.error('切换状态失败:', error);
            alert('切换状态失败：' + error.message);
        }
    };
    
    /**
     * 加载可用订单
     */
    const loadAvailableOrders = async () => {
        try {
            // 调用后端API获取附近的待接单订单
            const response = await fetch(`/api/available-orders?driver=${account}`);
            const data = await response.json();
            
            // 获取链上订单详情
            const orderDetails = await Promise.all(
                data.orderIds.map(async (orderId) => {
                    const order = await contracts.rideOrder.getOrder(orderId);
                    return {
                        ...order,
                        orderId: orderId,
                        distance: data.distances[orderId], // 距离信息从后端获取
                    };
                })
            );
            
            setAvailableOrders(orderDetails);
        } catch (error) {
            console.error('加载订单失败:', error);
        }
    };
    
    /**
     * 监听新订单
     */
    const listenForNewOrders = () => {
        contracts.rideOrder.on('OrderCreated', async (orderId, passenger) => {
            console.log('新订单:', orderId.toNumber());
            // 重新加载可用订单列表
            loadAvailableOrders();
        });
    };
    
    /**
     * 接单
     */
    const acceptOrder = async (orderId) => {
        try {
            // 检查司机资格
            const isEligible = await contracts.userRegistry.isDriverEligible(account);
            if (!isEligible) {
                alert('您暂时无法接单，请检查账户状态或联系客服');
                return;
            }
            
            const tx = await contracts.rideOrder.acceptOrder(orderId);
            await tx.wait();
            
            // 获取订单详情
            const order = await contracts.rideOrder.getOrder(orderId);
            setCurrentOrder({ ...order, orderId });
            
            // 从可用订单列表中移除
            setAvailableOrders(prev => prev.filter(o => o.orderId !== orderId));
            
            alert('接单成功！请前往乘客位置');
        } catch (error) {
            console.error('接单失败:', error);
            alert('接单失败：' + error.message);
        }
    };
    
    /**
     * 确认接到乘客
     */
    const confirmPickup = async () => {
        try {
            const tx = await contracts.rideOrder.confirmPickup(currentOrder.orderId);
            await tx.wait();
            
            // 在支付合约中开始行程
            const tx2 = await contracts.paymentEscrow.startRide(currentOrder.orderId);
            await tx2.wait();
            
            setCurrentOrder(prev => ({ ...prev, status: 'pickedUp' }));
            alert('已确认接到乘客，开始行程');
        } catch (error) {
            console.error('确认接客失败:', error);
            alert('确认接客失败：' + error.message);
        }
    };
    
    /**
     * 完成订单
     */
    const completeOrder = async (actualFare) => {
        try {
            // 1. 在订单合约中完成订单
            const tx1 = await contracts.rideOrder.completeOrder(
                currentOrder.orderId,
                ethers.utils.parseEther(actualFare.toString())
            );
            await tx1.wait();
            
            // 2. 在支付合约中释放资金
            const tx2 = await contracts.paymentEscrow.completeOrder(currentOrder.orderId);
            await tx2.wait();
            
            setCurrentOrder(prev => ({ ...prev, status: 'completed', actualFare }));
            
            alert('订单完成，资金已到账！请评价乘客');
        } catch (error) {
            console.error('完成订单失败:', error);
            alert('完成订单失败：' + error.message);
        }
    };
    
    /**
     * 提交评价
     */
    const submitRating = async (orderId, passengerAddress, score, comment) => {
        try {
            const tx = await contracts.ratingSystem.submitRating(
                orderId,
                passengerAddress,
                score,
                comment
            );
            
            await tx.wait();
            
            setCurrentOrder(null);
            alert('评价提交成功！');
            
            // 重新加载订单历史和统计
            loadDriverInfo(account);
        } catch (error) {
            console.error('提交评价失败:', error);
            alert('提交评价失败：' + error.message);
        }
    };
    
    /**
     * 取消订单
     */
    const cancelOrder = async (orderId, reason) => {
        try {
            const tx = await contracts.rideOrder.cancelOrder(orderId, reason);
            await tx.wait();
            
            setCurrentOrder(null);
            alert('订单已取消');
        } catch (error) {
            console.error('取消订单失败:', error);
            alert('取消订单失败：' + error.message);
        }
    };
    
    return (
        <div className="driver-app">
            <header>
                <h1>TrustFlow - 司机端</h1>
                {!isConnected ? (
                    <button onClick={connectWallet}>连接钱包</button>
                ) : (
                    <div className="driver-header">
                        <p>账户: {account.substring(0, 6)}...{account.substring(38)}</p>
                        <button 
                            onClick={toggleOnlineStatus}
                            className={isOnline ? 'online' : 'offline'}
                        >
                            {isOnline ? '在线（点击下线）' : '离线（点击上线）'}
                        </button>
                    </div>
                )}
            </header>
            
            <main>
                {/* 司机统计信息 */}
                <div className="driver-stats">
                    <h2>我的统计</h2>
                    <div className="stats-grid">
                        <div>
                            <h3>总行程</h3>
                            <p>{driverStats.totalRides}</p>
                        </div>
                        <div>
                            <h3>总收入</h3>
                            <p>{driverStats.totalEarnings} ETH</p>
                        </div>
                        <div>
                            <h3>评分</h3>
                            <p>{driverStats.rating.toFixed(1)} ⭐</p>
                        </div>
                    </div>
                </div>
                
                {/* 当前订单 */}
                {currentOrder && (
                    <div className="current-order">
                        <h2>当前订单</h2>
                        <div className="order-details">
                            <p>订单号: {currentOrder.orderId}</p>
                            <p>乘客: {currentOrder.passenger}</p>
                            <p>上车点: {currentOrder.pickup.address}</p>
                            <p>目的地: {currentOrder.destination.address}</p>
                            <p>预估费用: {ethers.utils.formatEther(currentOrder.estimatedFare)} ETH</p>
                            <p>状态: {['待接单', '已接单', '进行中', '已完成'][currentOrder.status]}</p>
                        </div>
                        
                        {currentOrder.status === 1 && (
                            <div className="order-actions">
                                <button onClick={confirmPickup}>确认接到乘客</button>
                                <button onClick={() => cancelOrder(currentOrder.orderId, '司机取消')}>
                                    取消订单
                                </button>
                            </div>
                        )}
                        
                        {currentOrder.status === 2 && (
                            <div className="order-actions">
                                <input 
                                    type="number" 
                                    id="actual-fare" 
                                    placeholder="实际费用"
                                    step="0.01"
                                    defaultValue={ethers.utils.formatEther(currentOrder.estimatedFare)}
                                />
                                <button onClick={() => {
                                    const fare = document.getElementById('actual-fare').value;
                                    completeOrder(fare);
                                }}>
                                    完成订单
                                </button>
                            </div>
                        )}
                        
                        {currentOrder.status === 3 && (
                            <div className="rating-form">
                                <h3>评价乘客</h3>
                                <select id="rating-score">
                                    <option value="5">5星 - 非常好</option>
                                    <option value="4">4星 - 好</option>
                                    <option value="3">3星 - 一般</option>
                                    <option value="2">2星 - 差</option>
                                    <option value="1">1星 - 非常差</option>
                                </select>
                                <textarea id="rating-comment" placeholder="评价内容（可选）"></textarea>
                                <button onClick={() => {
                                    const score = document.getElementById('rating-score').value;
                                    const comment = document.getElementById('rating-comment').value;
                                    submitRating(currentOrder.orderId, currentOrder.passenger, score, comment);
                                }}>
                                    提交评价
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* 可用订单列表 */}
                {isOnline && !currentOrder && (
                    <div className="available-orders">
                        <h2>可接订单</h2>
                        {availableOrders.length === 0 ? (
                            <p>暂无可接订单</p>
                        ) : (
                            <ul>
                                {availableOrders.map((order) => (
                                    <li key={order.orderId} className="order-item">
                                        <div className="order-info">
                                            <p><strong>订单 #{order.orderId}</strong></p>
                                            <p>上车点: {order.pickup.address}</p>
                                            <p>目的地: {order.destination.address}</p>
                                            <p>预估费用: {ethers.utils.formatEther(order.estimatedFare)} ETH</p>
                                            <p>距离: {order.distance} km</p>
                                        </div>
                                        <button onClick={() => acceptOrder(order.orderId)}>
                                            接单
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default TF_DriverApp;

