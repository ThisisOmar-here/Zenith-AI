import React, { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import characterData from '../data/characterExpressions.json';

interface CharacterProps {
  expression?: keyof typeof characterData.expressions;
  context?: keyof typeof characterData.contexts;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onClick?: () => void;
}

const Character: React.FC<CharacterProps> = ({
  expression = 'neutral',
  context,
  size = 'medium',
  showTooltip = false,
  onClick
}) => {
  const [currentExpression, setCurrentExpression] = useState(expression);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const [lastAnimation, setLastAnimation] = useState<string>('');
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const [showSpeech, setShowSpeech] = useState(false);

  // Get expression from context if provided
  useEffect(() => {
    if (context && characterData.contexts[context]) {
      const contextExpressions = characterData.contexts[context];
      const randomExpression = contextExpressions[Math.floor(Math.random() * contextExpressions.length)];
      setCurrentExpression(randomExpression as keyof typeof characterData.expressions);
    } else {
      setCurrentExpression(expression);
    }
  }, [context, expression]);

  // Auto-blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000); // Random blink every 3-5 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  const expressionData = characterData.expressions[currentExpression];

  // Size configurations
  const sizeConfig = {
    small: { size: 50 },
    medium: { size: 70 },
    large: { size: 90 }
  };

  // Get animation transform based on current animation type
  const getAnimationTransform = () => {
    if (!isAnimating) return 'scale(1) rotate(0deg)';

    switch (currentAnimation) {
      case 'bounce':
        return 'scale(1.2) translateY(-10px)';
      case 'wiggle':
        return 'scale(1.1) rotate(10deg)';
      case 'spin':
        return 'scale(1.1) rotate(360deg)';
      case 'pulse':
        return 'scale(1.3)';
      case 'shake':
        return 'scale(1.1) translateX(5px)';
      case 'jump':
        return 'scale(1.2) translateY(-15px) rotate(5deg)';
      case 'wave':
        return 'scale(1.1) rotate(-10deg) translateX(-5px)';
      case 'dance':
        return 'scale(1.15) rotate(15deg) translateY(-5px)';
      case 'flip':
        return 'scale(1.2) rotateY(180deg)';
      case 'stretch':
        return 'scaleY(1.3) scaleX(0.8)';
      default:
        return 'scale(1.1) rotate(5deg)';
    }
  };

  // Spring animation for character appearance
  const characterSpring = useSpring({
    opacity: 1,
    transform: getAnimationTransform(),
    from: { opacity: 0, transform: 'scale(0.8) rotate(0deg)' },
    config: { tension: 300, friction: 30 }
  });

  // Floating animation
  const floatSpring = useSpring({
    transform: 'translateY(0px)',
    from: { transform: 'translateY(-5px)' },
    config: { duration: 2000 },
    loop: { reverse: true }
  });

  // Speech bubble animation
  const speechSpring = useSpring({
    opacity: showSpeech ? 1 : 0,
    transform: showSpeech ? 'translateY(0px) scale(1)' : 'translateY(10px) scale(0.8)',
    config: { tension: 300, friction: 25 }
  });

  // Handle character click with varied animations, speech, and impressions
  const handleClick = () => {
    if (onClick) {
      onClick();
    }

    // 30% chance to do an impression instead of normal interaction
    const shouldDoImpression = Math.random() < 0.3;
    let randomMessage = '';

    if (shouldDoImpression) {
      // Get random impression
      const impressionTypes = ['robot', 'shakespeare', 'superhero', 'detective', 'pirate', 'chef', 'scientist', 'artist', 'teacher', 'comedian'];
      const randomImpressionType = impressionTypes[Math.floor(Math.random() * impressionTypes.length)];
      
      // Set message based on impression
      const impressionMessages = {
        robot: "BEEP BOOP! I AM A ROBOT 🤖",
        shakespeare: "To be or not to be... 🎭",
        superhero: "With great power! 💪⚡",
        detective: "Elementary, my dear! 🔍",
        pirate: "Ahoy matey! 🏴‍☠️",
        chef: "Bon appétit! 👨‍🍳✨",
        scientist: "Eureka! I've found it! 🧪",
        artist: "Art is life! 🎨💕",
        teacher: "Class is in session! 📚",
        comedian: "Why so serious? 😄"
      };
      
      randomMessage = impressionMessages[randomImpressionType as keyof typeof impressionMessages];
    } else {
      // Normal personality-based messages
      const availableMessages = getSpeechMessages();
      randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    }

    // Get random animation (different from last one)
    let availableAnimations = animationTypes.filter(anim => anim !== lastAnimation);
    const randomAnimation = availableAnimations[Math.floor(Math.random() * availableAnimations.length)];

    // Set animation and speech
    setCurrentAnimation(randomAnimation);
    setLastAnimation(randomAnimation);
    setSpeechBubble(randomMessage);
    setIsAnimating(true);
    setShowSpeech(true);

    // Clear animation after duration
    setTimeout(() => {
      setIsAnimating(false);
      setCurrentAnimation('');
    }, 800);

    // Hide speech bubble after longer duration for impressions
    const speechDuration = shouldDoImpression ? 3500 : 2500;
    setTimeout(() => {
      setShowSpeech(false);
    }, speechDuration);
  };

  // Get colors and style based on expression
  const getExpressionColors = () => {
    switch (currentExpression) {
      case 'happy':
        return { primary: '#FFE066', secondary: '#FFD93D', accent: '#FF6B9D', glow: '#FFE066' };
      case 'excited':
        return { primary: '#FF6B9D', secondary: '#FF4081', accent: '#FFD93D', glow: '#FF6B9D' };
      case 'thinking':
        return { primary: '#64B5F6', secondary: '#42A5F5', accent: '#AB47BC', glow: '#64B5F6' };
      case 'confused':
        return { primary: '#FFCC80', secondary: '#FFB74D', accent: '#8BC34A', glow: '#FFCC80' };
      case 'sad':
        return { primary: '#81C784', secondary: '#66BB6A', accent: '#42A5F5', glow: '#81C784' };
      case 'surprised':
        return { primary: '#FF8A65', secondary: '#FF7043', accent: '#FFD93D', glow: '#FF8A65' };
      case 'love':
        return { primary: '#F48FB1', secondary: '#E91E63', accent: '#FFE066', glow: '#F48FB1' };
      case 'cool':
        return { primary: '#4FC3F7', secondary: '#29B6F6', accent: '#26C6DA', glow: '#4FC3F7' };
      case 'sleepy':
        return { primary: '#B39DDB', secondary: '#9575CD', accent: '#FFE066', glow: '#B39DDB' };
      case 'angry':
        return { primary: '#EF5350', secondary: '#F44336', accent: '#FF9800', glow: '#EF5350' };
      case 'wink':
        return { primary: '#FFCC80', secondary: '#FFB74D', accent: '#FF6B9D', glow: '#FFCC80' };
      case 'neutral':
        return { primary: '#AB47BC', secondary: '#9C27B0', accent: '#E1BEE7', glow: '#AB47BC' };
      default:
        return { primary: '#AB47BC', secondary: '#9C27B0', accent: '#E1BEE7', glow: '#AB47BC' };
    }
  };

  const colors = getExpressionColors();

  // Animation types for variety
  const animationTypes = [
    'bounce', 'wiggle', 'spin', 'pulse', 'shake', 'jump', 'wave', 'dance', 'flip', 'stretch'
  ];

  // Personality-driven speech messages based on current expression
  const getSpeechMessages = () => {
    const baseMessages = [
      "Hey there! 👋", "What's up? 😊", "I'm here to help! 💙", "Let's chat! 💬",
      "Ready when you are! ⚡", "How are you feeling? 🤗", "What's on your mind? 🧠"
    ];

    const expressionMessages = {
      happy: ["Feeling great today! 😊", "Life is beautiful! 🌟", "Positivity vibes! ✨", "Spread the joy! 🎉"],
      excited: ["This is AWESOME! 🤩", "I'm pumped! 🚀", "Let's do this! 💪", "Energy level: MAX! ⚡"],
      love: ["Sending love! 💕", "You're amazing! 💖", "Big hugs! 🤗", "Love is in the air! �"],
      cool: ["Keepin' it cool 😎", "No worries! 🆒", "Chill vibes 🌊", "Stay awesome! 👌"],
      thinking: ["Hmm, interesting... 🤔", "Let me think... 💭", "Processing... 🧠", "Good question! 🤓"],
      confused: ["Wait, what? 😵", "I'm puzzled... 🤷", "Help me understand? 🤨", "That's confusing! 😅"],
      surprised: ["OMG! 😲", "No way! 🤯", "Seriously?! 😱", "That's incredible! �"],
      sad: ["I'm here for you 💙", "It's okay... 🥺", "Virtual hug? 🤗", "We'll get through this 💪"],
      sleepy: ["So sleepy... �", "Need coffee... ☕", "Zzz... 💤", "Almost bedtime? 🌙"],
      angry: ["Grr! 😠", "That's frustrating! 💢", "Need to cool down 🌬️", "Deep breaths... 😤"],
      wink: ["😉 You know it!", "Our little secret 🤫", "Smooth! 😏", "You got this! �"],
      neutral: ["Just chillin' 🤖", "Balanced vibes ⚖️", "Steady as always �", "Here and present 🧘"]
    };

    return [...baseMessages, ...(expressionMessages[currentExpression] || [])];
  };

  return (
    <div className="relative inline-block">
      {/* Modern Speech Bubble */}
      <animated.div
        style={speechSpring}
        className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl px-4 py-3 shadow-xl border-2 border-white/20 z-10 pointer-events-none max-w-48"
      >
        <div className="text-sm font-medium text-center whitespace-nowrap overflow-hidden text-ellipsis">
          {speechBubble}
        </div>
        {/* Speech bubble tail */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-violet-500"></div>
      </animated.div>

      <animated.div
        style={{
          ...characterSpring,
          ...floatSpring
        }}
        className="cursor-pointer"
        onClick={handleClick}
        title={showTooltip ? expressionData.description : undefined}
      >
        {/* SVG Modern Cartoon Character - Zoe */}
        <svg
          width={sizeConfig[size].size}
          height={sizeConfig[size].size}
          viewBox="0 0 120 120"
          className="drop-shadow-lg hover:drop-shadow-xl transition-all duration-300"
        >
          {/* Glow Effect */}
          <defs>
            <radialGradient id={`glow-${currentExpression}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Glow background */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill={`url(#glow-${currentExpression})`}
            className="transition-all duration-500"
          />

          {/* Character Body - More rounded and cute */}
          <ellipse
            cx="60"
            cy="85"
            rx="20"
            ry="25"
            fill={colors.primary}
            stroke={colors.accent}
            strokeWidth="2"
            className="transition-all duration-500"
            filter="url(#glow)"
          />

          {/* Character Head - Bigger and more expressive */}
          <circle
            cx="60"
            cy="45"
            r="28"
            fill={colors.secondary}
            stroke={colors.accent}
            strokeWidth="3"
            className="transition-all duration-500"
            filter="url(#glow)"
          />

          {/* Head highlight */}
          <ellipse
            cx="55"
            cy="35"
            rx="15"
            ry="18"
            fill="rgba(255,255,255,0.3)"
            className="transition-all duration-500"
          />

          {/* Eyes - More expressive based on mood */}
          {currentExpression === 'cool' && (
            <>
              {/* Sunglasses */}
              <rect x="40" y="35" width="40" height="15" rx="7" fill="#1a1a1a" />
              <rect x="42" y="37" width="15" height="11" rx="5" fill="#333" />
              <rect x="63" y="37" width="15" height="11" rx="5" fill="#333" />
              <line x1="57" y1="42" x2="63" y2="42" stroke="#1a1a1a" strokeWidth="2" />
              <circle cx="49" cy="42" r="1" fill="rgba(255,255,255,0.3)" />
              <circle cx="70" cy="42" r="1" fill="rgba(255,255,255,0.3)" />
            </>
          )}

          {currentExpression === 'sleepy' && (
            <>
              {/* Sleepy eyes */}
              <path d="M 45 40 Q 50 45 55 40" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 65 40 Q 70 45 75 40" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Sleepy Z's */}
              <text x="80" y="30" fontSize="8" fill={colors.accent}>z</text>
              <text x="85" y="25" fontSize="6" fill={colors.accent}>z</text>
              <text x="88" y="22" fontSize="4" fill={colors.accent}>z</text>
            </>
          )}

          {currentExpression === 'love' && (
            <>
              {/* Heart eyes */}
              <text x="47" y="44" fontSize="12" fill="#E91E63">♥</text>
              <text x="67" y="44" fontSize="12" fill="#E91E63">♥</text>
            </>
          )}

          {currentExpression === 'angry' && (
            <>
              {/* Angry eyes with eyebrows */}
              <path d="M 42 35 L 52 40" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" />
              <path d="M 78 35 L 68 40" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" />
              <circle cx="47" cy="42" r="3" fill="#FF0000" />
              <circle cx="73" cy="42" r="3" fill="#FF0000" />
            </>
          )}

          {currentExpression === 'surprised' && (
            <>
              {/* Wide surprised eyes */}
              <circle cx="50" cy="40" r="6" fill="white" stroke="#2C3E50" strokeWidth="2" />
              <circle cx="70" cy="40" r="6" fill="white" stroke="#2C3E50" strokeWidth="2" />
              <circle cx="50" cy="40" r="3" fill="#2C3E50" />
              <circle cx="70" cy="40" r="3" fill="#2C3E50" />
            </>
          )}

          {currentExpression === 'wink' && (
            <>
              {/* Winking eyes */}
              <circle cx="50" cy="40" r="4" fill="#2C3E50" />
              <circle cx="51" cy="38" r="1.5" fill="white" />
              <path d="M 65 38 Q 70 42 75 38" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          )}

          {currentExpression === 'thinking' && (
            <>
              {/* Thinking eyes looking up */}
              <circle cx="48" cy="38" r="4" fill="#2C3E50" />
              <circle cx="72" cy="38" r="4" fill="#2C3E50" />
              <circle cx="49" cy="36" r="1.5" fill="white" />
              <circle cx="73" cy="36" r="1.5" fill="white" />
              {/* Thought bubble */}
              <circle cx="85" cy="25" r="3" fill="rgba(255,255,255,0.8)" stroke={colors.accent} strokeWidth="1" />
              <circle cx="90" cy="20" r="2" fill="rgba(255,255,255,0.8)" stroke={colors.accent} strokeWidth="1" />
              <circle cx="93" cy="17" r="1" fill="rgba(255,255,255,0.8)" stroke={colors.accent} strokeWidth="1" />
            </>
          )}

          {(currentExpression === 'happy' || currentExpression === 'excited' || currentExpression === 'neutral' || currentExpression === 'confused' || currentExpression === 'sad') && (
            <>
              {/* Normal expressive eyes */}
              <circle
                cx="50"
                cy="40"
                r={isBlinking ? "1" : "4"}
                fill="#2C3E50"
                className="transition-all duration-150"
              />
              <circle
                cx="70"
                cy="40"
                r={isBlinking ? "1" : "4"}
                fill="#2C3E50"
                className="transition-all duration-150"
              />
              {!isBlinking && (
                <>
                  <circle cx="51" cy="38" r="1.5" fill="white" />
                  <circle cx="71" cy="38" r="1.5" fill="white" />
                </>
              )}
            </>
          )}

          {/* Mouth expressions - More varied and expressive */}
          {currentExpression === 'happy' && (
            <path
              d="M 48 58 Q 60 68 72 58"
              stroke="#2C3E50"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {currentExpression === 'excited' && (
            <>
              <ellipse cx="60" cy="60" rx="8" ry="12" fill="#2C3E50" />
              <ellipse cx="60" cy="58" rx="6" ry="8" fill="#FF69B4" />
              {/* Excitement sparkles */}
              <text x="35" y="30" fontSize="8" fill="#FFD93D">✨</text>
              <text x="85" y="30" fontSize="8" fill="#FFD93D">✨</text>
              <text x="40" y="75" fontSize="6" fill="#FFD93D">⭐</text>
              <text x="80" y="75" fontSize="6" fill="#FFD93D">⭐</text>
            </>
          )}

          {currentExpression === 'sad' && (
            <>
              <path
                d="M 48 62 Q 60 52 72 62"
                stroke="#2C3E50"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              {/* Tear */}
              <ellipse cx="45" cy="48" rx="2" ry="4" fill="#42A5F5" />
            </>
          )}

          {currentExpression === 'surprised' && (
            <ellipse cx="60" cy="60" rx="4" ry="8" fill="#2C3E50" />
          )}

          {currentExpression === 'thinking' && (
            <line
              x1="52"
              y1="58"
              x2="68"
              y2="58"
              stroke="#2C3E50"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {currentExpression === 'confused' && (
            <>
              <path
                d="M 55 58 Q 60 62 65 58"
                stroke="#2C3E50"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              {/* Question mark */}
              <text x="80" y="55" fontSize="12" fill={colors.accent}>?</text>
            </>
          )}

          {currentExpression === 'love' && (
            <>
              <path
                d="M 48 58 Q 60 68 72 58"
                stroke="#E91E63"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              {/* Floating hearts */}
              <text x="35" y="25" fontSize="8" fill="#E91E63">💕</text>
              <text x="85" y="25" fontSize="6" fill="#E91E63">💖</text>
            </>
          )}

          {currentExpression === 'cool' && (
            <line
              x1="52"
              y1="58"
              x2="68"
              y2="58"
              stroke="#2C3E50"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {currentExpression === 'sleepy' && (
            <ellipse cx="60" cy="60" rx="3" ry="2" fill="#2C3E50" />
          )}

          {currentExpression === 'angry' && (
            <>
              <path
                d="M 50 62 Q 60 55 70 62"
                stroke="#2C3E50"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              {/* Steam from anger */}
              <text x="40" y="20" fontSize="8" fill="#EF5350">💢</text>
              <text x="75" y="20" fontSize="8" fill="#EF5350">💢</text>
            </>
          )}

          {currentExpression === 'wink' && (
            <path
              d="M 48 58 Q 60 65 72 58"
              stroke="#2C3E50"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {currentExpression === 'neutral' && (
            <line
              x1="52"
              y1="58"
              x2="68"
              y2="58"
              stroke="#2C3E50"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Cheeks for happy expressions */}
          {(currentExpression === 'happy' || currentExpression === 'excited' || currentExpression === 'love' || currentExpression === 'wink') && (
            <>
              <circle cx="35" cy="50" r="4" fill="#FF6B9D" opacity="0.6" />
              <circle cx="85" cy="50" r="4" fill="#FF6B9D" opacity="0.6" />
            </>
          )}

          {/* Arms - More dynamic positioning */}
          <ellipse
            cx="25"
            cy="75"
            rx="8"
            ry="18"
            fill={colors.primary}
            stroke={colors.accent}
            strokeWidth="2"
            transform={isAnimating ? "rotate(25 25 75)" : "rotate(10 25 75)"}
            className="transition-all duration-300"
          />
          <ellipse
            cx="95"
            cy="75"
            rx="8"
            ry="18"
            fill={colors.primary}
            stroke={colors.accent}
            strokeWidth="2"
            transform={isAnimating ? "rotate(-25 95 75)" : "rotate(-10 95 75)"}
            className="transition-all duration-300"
          />

          {/* Special accessories for certain moods */}
          {currentExpression === 'thinking' && (
            <ellipse cx="45" cy="25" rx="12" ry="8" fill="none" stroke={colors.accent} strokeWidth="2" opacity="0.7" />
          )}

          {currentExpression === 'cool' && (
            <ellipse cx="60" cy="20" rx="8" ry="4" fill={colors.accent} opacity="0.6" />
          )}
        </svg>
      </animated.div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          {expressionData.description}
        </div>
      )}

      {/* Expression Details (for debugging) */}
      {import.meta.env.DEV && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-gray-500 text-center">
          {currentExpression}
        </div>
      )}
    </div>
  );
};

// Character Manager Hook with Impressions
export const useCharacter = () => {
  const [expression, setExpression] = useState<keyof typeof characterData.expressions>('neutral');
  const [context, setContext] = useState<keyof typeof characterData.contexts | undefined>();
  const [currentImpression, setCurrentImpression] = useState<string>('');

  const changeExpression = (newExpression: keyof typeof characterData.expressions) => {
    setExpression(newExpression);
    setContext(undefined);
    setCurrentImpression('');
  };

  const changeContext = (newContext: keyof typeof characterData.contexts) => {
    setContext(newContext);
    setCurrentImpression('');
  };

  const getRandomExpression = () => {
    const expressions = Object.keys(characterData.expressions) as Array<keyof typeof characterData.expressions>;
    const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
    setExpression(randomExpression);
    setContext(undefined);
    setCurrentImpression('');
  };

  // Character Impressions - Zoe can do different character impressions
  const impressions = {
    robot: { expression: 'neutral' as const, speech: "BEEP BOOP! I AM A ROBOT 🤖", duration: 3000 },
    shakespeare: { expression: 'thinking' as const, speech: "To be or not to be... 🎭", duration: 3000 },
    superhero: { expression: 'excited' as const, speech: "With great power! 💪⚡", duration: 3000 },
    detective: { expression: 'thinking' as const, speech: "Elementary, my dear! 🔍", duration: 3000 },
    pirate: { expression: 'cool' as const, speech: "Ahoy matey! 🏴‍☠️", duration: 3000 },
    chef: { expression: 'happy' as const, speech: "Bon appétit! 👨‍🍳✨", duration: 3000 },
    scientist: { expression: 'thinking' as const, speech: "Eureka! I've found it! 🧪", duration: 3000 },
    artist: { expression: 'love' as const, speech: "Art is life! 🎨💕", duration: 3000 },
    teacher: { expression: 'neutral' as const, speech: "Class is in session! 📚", duration: 3000 },
    comedian: { expression: 'wink' as const, speech: "Why so serious? 😄", duration: 3000 }
  };

  const doImpression = (impressionType: keyof typeof impressions) => {
    const impression = impressions[impressionType];
    setCurrentImpression(impressionType);
    setExpression(impression.expression);
    
    // Return the impression data for the component to use
    return impression;
  };

  const getRandomImpression = () => {
    const impressionTypes = Object.keys(impressions) as Array<keyof typeof impressions>;
    const randomImpression = impressionTypes[Math.floor(Math.random() * impressionTypes.length)];
    return doImpression(randomImpression);
  };

  return {
    expression,
    context,
    currentImpression,
    changeExpression,
    changeContext,
    getRandomExpression,
    doImpression,
    getRandomImpression,
    impressions
  };
};

export default Character;
