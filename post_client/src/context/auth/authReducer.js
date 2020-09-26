import { USER_LOADED, AUTH_ERROR, LOGOUT } from "../types";

export default (state, action) => {
  switch (action.type) {
    case USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
      };
    case LOGOUT:
      localStorage.clear();
      return {
        ...state,
        user: null,
        error: action.payload,
      };
    default:
      return state;
  }
};
