const state = () => ({
  wavs: [],
});

// actions
const actions = {};

// mutations
const mutations = {
  wavs(state, payload) {
    state.wavs = payload;
  },
};

export default {
  namespaced: true,
  state,
  actions,
  mutations,
};
