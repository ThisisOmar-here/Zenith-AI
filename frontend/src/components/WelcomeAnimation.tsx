import React, { useEffect, useState } from 'react';
import { useScroll, animated, useSpring } from '@react-spring/web';

interface WelcomeAnimationProps {
  onComplete: () => void;
}

const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onComplete }) => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Scroll-triggered animation
  const { scrollYProgress } = useScroll({
    onChange: ({ value: { scrollYProgress } }) => {
      if (scrollYProgress > 0.1 && !hasScrolled) {
        setHasScrolled(true);
        setShowWelcome(true);
      }
    },
  });

  // Welcome text animation
  const welcomeSpring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'translateY(0px) scale(1)' : 'translateY(50px) scale(0.8)',
    config: { tension: 280, friction: 60 },
  });

  // Character animation
  const characterSpring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'translateX(0px) rotate(0deg)' : 'translateX(-100px) rotate(-10deg)',
    config: { tension: 200, friction: 25 },
    delay: showWelcome ? 300 : 0,
  });

  // Background animation
  const backgroundSpring = useSpring({
    background: showWelcome
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    config: { duration: 1000 },
  });

  // Feature animations - all hooks called unconditionally
  const feature1Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'translateY(0px)' : 'translateY(30px)',
    config: { tension: 280, friction: 60 },
    delay: showWelcome ? 800 : 0,
  });

  const feature2Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'translateY(0px)' : 'translateY(30px)',
    config: { tension: 280, friction: 60 },
    delay: showWelcome ? 1000 : 0,
  });

  const feature3Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'translateY(0px)' : 'translateY(30px)',
    config: { tension: 280, friction: 60 },
    delay: showWelcome ? 1200 : 0,
  });

  // Progress dots animations
  const dot1Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'scale(1)' : 'scale(0)',
    config: { tension: 300, friction: 30 },
    delay: showWelcome ? 0 : 0,
  });

  const dot2Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'scale(1)' : 'scale(0)',
    config: { tension: 300, friction: 30 },
    delay: showWelcome ? 200 : 0,
  });

  const dot3Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'scale(1)' : 'scale(0)',
    config: { tension: 300, friction: 30 },
    delay: showWelcome ? 400 : 0,
  });

  const dot4Spring = useSpring({
    opacity: showWelcome ? 1 : 0,
    transform: showWelcome ? 'scale(1)' : 'scale(0)',
    config: { tension: 300, friction: 30 },
    delay: showWelcome ? 600 : 0,
  });

  // Auto-trigger after 3 seconds if user doesn't scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasScrolled) {
        setHasScrolled(true);
        setShowWelcome(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasScrolled]);

  // Complete animation after showing welcome
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [showWelcome, onComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Animated Background */}
      <animated.div 
        style={backgroundSpring}
        className="absolute inset-0"
      />
      
      {/* Scroll Indicator */}
      {!hasScrolled && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center">
          <div className="animate-bounce">
            <div className="text-sm mb-2">Scroll to continue</div>
            <div className="w-6 h-10 border-2 border-white rounded-full mx-auto">
              <div className="w-1 h-3 bg-white rounded-full mx-auto mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Content */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-4xl">
          {/* Character */}
          <animated.div style={characterSpring} className="mb-8">
            <div className="text-8xl mb-4">🤖</div>
          </animated.div>

          {/* Welcome Text */}
          <animated.div style={welcomeSpring}>
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Welcome to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                Zenith AI
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Your intelligent companion for personal growth, productivity, and well-being. 
              Let's embark on this journey together.
            </p>
            
            {/* Animated Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <animated.div
                style={feature1Spring}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="text-4xl mb-3">🧠</div>
                <h3 className="text-lg font-semibold text-white">Smart Insights</h3>
              </animated.div>

              <animated.div
                style={feature2Spring}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-white">Goal Tracking</h3>
              </animated.div>

              <animated.div
                style={feature3Spring}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="text-4xl mb-3">💡</div>
                <h3 className="text-lg font-semibold text-white">Personalized Tips</h3>
              </animated.div>
            </div>
          </animated.div>
        </div>
      </div>

      {/* Progress Indicator */}
      {showWelcome && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            <animated.div
              style={dot1Spring}
              className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
            />
            <animated.div
              style={dot2Spring}
              className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
            />
            <animated.div
              style={dot3Spring}
              className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
            />
            <animated.div
              style={dot4Spring}
              className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeAnimation;
