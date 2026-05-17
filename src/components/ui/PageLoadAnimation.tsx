import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageLoadAnimationProps {
    onComplete?: () => void;
}

export default function PageLoadAnimation({ onComplete }: PageLoadAnimationProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if mobile
        setIsMobile(window.innerWidth < 1024);

        // Start exit animation after 3 seconds
        const exitTimer = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        // Unmount component after exit animation completes (3s + 1.5s buffer)
        const removeTimer = setTimeout(() => {
            onComplete?.();
        }, 4600); // 3000ms display + 1500ms exit + 100ms buffer

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [onComplete]);

    // Desktop: Epic Curtain Reveal with Particles
    const DesktopAnimation = () => (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B1120] via-[#1e1b4b] to-[#312e81]"
        >
            {/* Animated Particles Background */}
            <div className="absolute inset-0">
                {[...Array(50)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-emerald-400 rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            opacity: 0,
                            scale: 0,
                        }}
                        animate={{
                            y: [null, Math.random() * window.innerHeight],
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0],
                        }}
                        transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: 0,
                            delay: Math.random() * 0.5,
                        }}
                    />
                ))}
            </div>

            {/* Left Curtain */}
            <motion.div
                className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-[#0B1120] to-[#1e1b4b] shadow-2xl"
                initial={{ x: 0 }}
                animate={{ x: '-100%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: [0.76, 0, 0.24, 1] }}
            >
                <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm" />
            </motion.div>

            {/* Right Curtain */}
            <motion.div
                className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-[#0B1120] to-[#1e1b4b] shadow-2xl"
                initial={{ x: 0 }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: [0.76, 0, 0.24, 1] }}
            >
                <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm" />
            </motion.div>

            {/* Center Logo with Epic Reveal */}
            <motion.div
                className="relative z-10"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Glow Effect */}
                <motion.div
                    className="absolute inset-0 bg-emerald-500/30 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Logo Only */}
                <div className="relative flex items-center justify-center">
                    <motion.img
                        src="/logo.png"
                        alt="InfinityPlay Logo"
                        className="w-48 h-48 object-contain"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            duration: 1.2,
                            delay: 0.2,
                            ease: [0.34, 1.56, 0.64, 1]
                        }}
                    />
                </div>
            </motion.div>

            {/* Radial Pulse Effect */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-32 h-32 border-2 border-emerald-500/30 rounded-full"
                        animate={{
                            scale: [1, 4, 4],
                            opacity: [0.6, 0.3, 0],
                        }}
                        transition={{
                            duration: 2,
                            delay: i * 0.3,
                            repeat: 0,
                            ease: "easeOut",
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );

    // Mobile: Smooth Slide-Up with Pulse
    const MobileAnimation = () => (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1120] via-[#1e1b4b] to-[#312e81]"
        >
            {/* Animated Background Waves */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-t-full"
                        initial={{ y: '100%', scale: 0.8 }}
                        animate={{ y: '-100%', scale: 1.2 }}
                        transition={{
                            duration: 2,
                            delay: i * 0.2,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </div>

            {/* Logo Container */}
            <motion.div
                className="relative z-10 px-8"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Pulsing Glow */}
                <motion.div
                    className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Logo Only */}
                <div className="relative text-center flex flex-col items-center">
                    <motion.img
                        src="/logo.png"
                        alt="InfinityPlay Logo"
                        className="w-32 h-32 object-contain"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            duration: 1.2,
                            delay: 0.2,
                            ease: [0.34, 1.56, 0.64, 1]
                        }}
                    />
                </div>
            </motion.div>

            {/* Bottom Accent Line */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
            />
        </motion.div>
    );

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                isMobile ? <MobileAnimation /> : <DesktopAnimation />
            )}
        </AnimatePresence>
    );
}
