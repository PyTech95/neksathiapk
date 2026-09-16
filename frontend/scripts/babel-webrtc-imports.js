// WebRTC 124 imports an unexported '/index' path in event-target-shim v6.
// Its package root exports the exact same API. Scope this correction to WebRTC
// so React Native's independent event-target-shim dependency is left untouched.
// Applied on every build/install; no node_modules or Metro configuration edits.
module.exports = function () {
  return {
    name: 'neksathi-webrtc-export-compatibility',
    visitor: {
      ImportDeclaration(path, state) {
        const file = (state.filename || '').replace(/\\/g, '/');
        if (file.includes('/react-native-webrtc/') && path.node.source.value === 'event-target-shim/index') {
          path.node.source.value = 'event-target-shim';
        }
      },
    },
  };
};