// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const baseConfig = require('./.config/jest.config');

module.exports = {
    ...baseConfig,
    testMatch: [
        ...(baseConfig.testMatch || []),
        '<rootDir>/tests/unit/**/*.{spec,test,jest}.{js,jsx,ts,tsx}',
    ],
};
