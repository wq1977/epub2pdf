import { createLogger, createStore } from "vuex";
import user from "/@/store/modules/user";

const debug = process.env.NODE_ENV !== "production";
export default createStore({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    user,
  },
  plugins: debug ? [createLogger()] : [],
});
