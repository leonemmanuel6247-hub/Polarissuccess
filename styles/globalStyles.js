import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  CYAN: '#00D4FF',
  CYAN_LIGHT: '#70E2FF',
  SKY_BLUE: '#87CEEB',
  GREEN: '#4CAF50',
  RED: '#F44336',
  GRAY: '#9E9E9E',
  DARK_GRAY: '#333333',
  LIGHT_GRAY: '#F5F5F5',
};

export const SIZES = {
  WIDTH: width,
  HEIGHT: height,
  CENTER_X: width / 2,
  CENTER_Y: height / 2,
  BASE_SIZE: Math.min(width, height),
  ORBE_RADIUS: Math.min(width, height) * 0.1,
  ANNEAU1_RADIUS: Math.min(width, height) * 0.16,
  ANNEAU2_RADIUS: Math.min(width, height) * 0.22,
  ANNEAU3_RADIUS: Math.min(width, height) * 0.28,
  TEXT_SIZE: Math.min(width, height) * 0.055,
};

export const FONTS = {
  TITLE: { fontSize: 28, fontWeight: 'bold', color: COLORS.CYAN, letterSpacing: 2 },
  SUBTITLE: { fontSize: 16, color: '#aaa', textAlign: 'center' },
  BODY: { fontSize: 16, color: COLORS.WHITE },
  SMALL: { fontSize: 12, color: COLORS.CYAN_LIGHT },
};

export const SHADOWS = {
  NEON: {
    shadowColor: COLORS.CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  CARD: {
    shadowColor: COLORS.CYAN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
};
