import React, { useReducer } from "react";
import AuthContext from "./authContext";
import authReducer from "./authReducer";
import { AUTH_ERROR, USER_LOADED, LOGOUT } from "../types";

const AuthState = (props) => {
  const initialState = {
    user: null,
    error: null,
  };
  const [state, dispatch] = useReducer(authReducer, initialState);
  // load user
  const loadUser = async () => {
    const token = localStorage.getItem("token");
    const graphqlQuery = {
      query: `
        {
          user {
            _id
            name
            email
          }
        }
      `,
    };
    if (token) {
      try {
        const res = await fetch("http://localhost:8080/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(graphqlQuery),
        });

        const resData = await res.json();
        const { user } = resData.data;
        dispatch({ type: USER_LOADED, payload: user });
      } catch (err) {
        dispatch({ type: AUTH_ERROR });
      }
    }
  };

  // logout
  const logout = () => dispatch({ type: LOGOUT });

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        error: state.error,
        loadUser,
        logout,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthState;
