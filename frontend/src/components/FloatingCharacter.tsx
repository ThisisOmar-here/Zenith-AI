import React, { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import Character, { useCharacter } from './Character';

interface FloatingCharacterProps {
  isVisible?: boolean;
}

const FloatingCharacter: React.FC<FloatingCharacterProps> = ({ isVisible = true }) => {
  const [position, setPosition] = useState({ x: 85, y: 85 }); // Start bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { expression, context, changeContext, getRandomExpression } = useCharacter();

  // Floating movement positions (percentage of screen)
  const floatingPositions = [
    { x: 85, y: 85 }, // Bottom-right
    { x: 85, y: 15 }, // Top-right
    { x: 15, y: 85 }, // Bottom-left
    { x: 15, y: 15 }, // Top-left
    { x: 50, y: 85 }, // Bottom-center
    { x: 85, y: 50 }, // Middle-right
    { x: 15, y: 50 }, // Middle-left
  ];

  // Auto-move character to different positions
  useEffect(() => {
    if (isDragging) return;

    const moveInterval = setInterval(() => {
      const availablePositions = floatingPositions.filter(
        pos => pos.x !== position.x || pos.y !== position.y
      );
      const randomPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      setPosition(randomPosition);
    }, 15000 + Math.random() * 10000); // Move every 15-25 seconds

    return () => clearInterval(moveInterval);
  }, [position, isDragging]);

  // Spring animation for position changes
  const positionSpring = useSpring({
    transform: `translate(${position.x}vw, ${position.y}vh)`,
    config: { tension: 120, friction: 40 }
  });

  // Handle mouse/touch events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = Math.max(5, Math.min(95, ((e.clientX - dragOffset.x) / window.innerWidth) * 100));
    const newY = Math.max(5, Math.min(95, ((e.clientY - dragOffset.y) / window.innerHeight) * 100));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Character click handler
  const handleCharacterClick = () => {
    getRandomExpression();
    changeContext('success');
  };

  if (!isVisible) return null;

  return (
    <animated.div
      style={positionSpring}
      className={`fixed z-50 pointer-events-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
    >
      <div className="relative">
        {/* Floating glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
        
        {/* Character */}
        <div className="relative transform hover:scale-110 transition-transform duration-300">
          <Character
            expression={expression}
            context={context}
            size="medium"
            showTooltip={true}
            onClick={handleCharacterClick}
          />
        </div>

        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            Drag me!
          </div>
        )}
      </div>
    </animated.div>
  );
};

export default FloatingCharacter;
