import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

// 导入合约ABI（实际项目中需要从编译后的文件导入）
import TrustFlowEscrowABI from '../../contracts/abi/TrustFlowEscrow.json';
import TrustFlowRideABI from '../../contracts/abi/TrustFlowRide.json';
import TrustFlowRatingABI from '../../contracts/abi/TrustFlowRating.json';

/**
 * 乘客端主应用组件
 */
const TF_PassengerApp = () => {
    // 状态管理
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contracts, setContracts] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    
    // 订单相关状态
    const [pickup, setPickup] = useState({ lat: 0, lng: 0, address: '' });
    const [destination, setDestination] = useState({ lat: 0, lng: 0, address: '' });
    const [estimatedFare, setEstimatedFare] = useState(0);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);
    
    // 合约地址（需要根据实际部署配置）
    const CONTRACT_ADDRESSES = {
        paymentEscrow: process.env.REACT_APP_PAYMENT_ESCROW_ADDRESS,
        rideOrder: process.env.REACT_APP_RIDE_ORDER_ADDRESS,
        ratingSystem: process.env.REACT_APP_RATING_SYSTEM_ADDRESS,
    };
    
    /**
     * 连接钱包
     */
    const connectWallet = async () => {
        try {
            const web3Modal = new Web3Modal({
                network: 'polygon', // 或其他网络
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
            
            // 初始化合约实例
            initializeContracts(signer);
            
            // 加载订单历史
            loadOrderHistory(account);
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
        
        setContracts({ paymentEscrow, rideOrder, ratingSystem });
    };
    
    /**
     * 计算预估费用
     */
    const calculateFare = async () => {
        try {
            // 调用后端API计算费用
            const response = await fetch('/api/calculate-fare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup, destination }),
            });
            
            const data = await response.json();
            setEstimatedFare(data.fare);
        } catch (error) {
            console.error('计算费用失败:', error);
        }
    };
    
    /**
     * 创建订单
     */
    const createOrder = async () => {
        if (!isConnected) {
            alert('请先连接钱包');
            return;
        }
        
        try {
            // 1. 在订单合约中创建订单
            const tx1 = await contracts.rideOrder.createOrder(
                Math.round(pickup.lat * 1e6),
                Math.round(pickup.lng * 1e6),
                pickup.address,
                Math.round(destination.lat * 1e6),
                Math.round(destination.lng * 1e6),
                destination.address,
                ethers.utils.parseEther(estimatedFare.toString())
            );
            
            const receipt1 = await tx1.wait();
            const orderEvent = receipt1.events.find(e => e.event === 'OrderCreated');
            const orderId = orderEvent.args.orderId.toNumber();
            
            // 2. 在支付合约中锁定资金（需要等待司机接单后获取司机地址）
            // 这里先记录订单ID，等司机接单后再锁定资金
            setCurrentOrder({ orderId, status: 'pending' });
            
            alert(`订单创建成功！订单号：${orderId}`);
            
            // 3. 监听订单被接受事件
            listenForOrderAccepted(orderId);
        } catch (error) {
            console.error('创建订单失败:', error);
            alert('创建订单失败：' + error.message);
        }
    };
    
    /**
     * 监听订单被接受
     */
    const listenForOrderAccepted = (orderId) => {
        contracts.rideOrder.on('OrderAccepted', async (eventOrderId, driver) => {
            if (eventOrderId.toNumber() === orderId) {
                console.log('订单已被接受，司机地址：', driver);
                
                // 锁定资金
                await lockPayment(orderId, driver);
                
                setCurrentOrder(prev => ({ ...prev, status: 'accepted', driver }));
            }
        });
    };
    
    /**
     * 锁定支付
     */
    const lockPayment = async (orderId, driverAddress) => {
        try {
            const tx = await contracts.paymentEscrow.createOrder(driverAddress, {
                value: ethers.utils.parseEther(estimatedFare.toString()),
            });
            
            await tx.wait();
            console.log('资金锁定成功');
        } catch (error) {
            console.error('资金锁定失败:', error);
        }
    };
    
    /**
     * 取消订单
     */
    const cancelOrder = async (orderId) => {
        try {
            const tx = await contracts.rideOrder.cancelOrder(orderId, '乘客取消');
            await tx.wait();
            
            // 退款
            const tx2 = await contracts.paymentEscrow.cancelOrder(orderId);
            await tx2.wait();
            
            setCurrentOrder(null);
            alert('订单已取消，资金已退回');
        } catch (error) {
            console.error('取消订单失败:', error);
            alert('取消订单失败：' + error.message);
        }
    };
    
    /**
     * 提交评价
     */
    const submitRating = async (orderId, driverAddress, score, comment) => {
        try {
            const tx = await contracts.ratingSystem.submitRating(
                orderId,
                driverAddress,
                score,
                comment
            );
            
            await tx.wait();
            alert('评价提交成功！');
        } catch (error) {
            console.error('提交评价失败:', error);
            alert('提交评价失败：' + error.message);
        }
    };
    
    /**
     * 加载订单历史
     */
    const loadOrderHistory = async (account) => {
        try {
            const orders = await contracts.rideOrder.getPassengerOrders(account);
            const orderDetails = await Promise.all(
                orders.map(orderId => contracts.rideOrder.getOrder(orderId))
            );
            setOrderHistory(orderDetails);
        } catch (error) {
            console.error('加载订单历史失败:', error);
        }
    };
    
    /**
     * 监听订单状态更新
     */
    useEffect(() => {
        if (currentOrder) {
            // 监听订单完成事件
            contracts.rideOrder.on('OrderCompleted', (orderId, actualFare) => {
                if (orderId.toNumber() === currentOrder.orderId) {
                    setCurrentOrder(prev => ({ 
                        ...prev, 
                        status: 'completed',
                        actualFare: ethers.utils.formatEther(actualFare)
                    }));
                    
                    alert('行程已完成，请评价司机');
                }
            });
        }
    }, [currentOrder]);
    
    return (
        <div className="passenger-app">
            <header>
                <h1>TrustFlow - 乘客端</h1>
                {!isConnected ? (
                    <button onClick={connectWallet}>连接钱包</button>
                ) : (
                    <div>
                        <p>已连接: {account.substring(0, 6)}...{account.substring(38)}</p>
                    </div>
                )}
            </header>
            
            <main>
                {/* 地图组件 */}
                <div className="map-container">
                    {/* 这里集成地图组件（高德、百度等） */}
                    <div id="map" style={{ height: '400px', background: '#eee' }}>
                        地图区域
                    </div>
                </div>
                
                {/* 订单创建表单 */}
                {!currentOrder && (
                    <div className="order-form">
                        <h2>创建订单</h2>
                        <div>
                            <label>上车点：</label>
                            <input 
                                type="text" 
                                value={pickup.address}
                                onChange={(e) => setPickup({...pickup, address: e.target.value})}
                                placeholder="请选择上车地点"
                            />
                        </div>
                        <div>
                            <label>目的地：</label>
                            <input 
                                type="text" 
                                value={destination.address}
                                onChange={(e) => setDestination({...destination, address: e.target.value})}
                                placeholder="请选择目的地"
                            />
                        </div>
                        <button onClick={calculateFare}>计算费用</button>
                        {estimatedFare > 0 && (
                            <div>
                                <p>预估费用: {estimatedFare} ETH</p>
                                <button onClick={createOrder}>确认下单</button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* 当前订单状态 */}
                {currentOrder && (
                    <div className="current-order">
                        <h2>当前订单</h2>
                        <p>订单号: {currentOrder.orderId}</p>
                        <p>状态: {currentOrder.status}</p>
                        {currentOrder.driver && (
                            <p>司机: {currentOrder.driver}</p>
                        )}
                        {currentOrder.status === 'pending' && (
                            <button onClick={() => cancelOrder(currentOrder.orderId)}>
                                取消订单
                            </button>
                        )}
                        {currentOrder.status === 'completed' && (
                            <div className="rating-form">
                                <h3>评价司机</h3>
                                <select id="rating-score">
                                    <option value="5">5星 - 非常满意</option>
                                    <option value="4">4星 - 满意</option>
                                    <option value="3">3星 - 一般</option>
                                    <option value="2">2星 - 不满意</option>
                                    <option value="1">1星 - 非常不满意</option>
                                </select>
                                <textarea id="rating-comment" placeholder="评价内容（可选）"></textarea>
                                <button onClick={() => {
                                    const score = document.getElementById('rating-score').value;
                                    const comment = document.getElementById('rating-comment').value;
                                    submitRating(currentOrder.orderId, currentOrder.driver, score, comment);
                                }}>
                                    提交评价
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* 订单历史 */}
                <div className="order-history">
                    <h2>订单历史</h2>
                    <ul>
                        {orderHistory.map((order, index) => (
                            <li key={index}>
                                <p>订单号: {order.orderId.toString()}</p>
                                <p>状态: {['待接单', '已接单', '进行中', '已完成', '已取消'][order.status]}</p>
                                <p>费用: {ethers.utils.formatEther(order.actualFare || order.estimatedFare)} ETH</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default TF_PassengerApp;

