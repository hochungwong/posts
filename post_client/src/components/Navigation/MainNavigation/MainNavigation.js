import React, { useEffect, useContext } from "react";
import { NavLink } from "react-router-dom";

import MobileToggle from "../MobileToggle/MobileToggle";
import Logo from "../../Logo/Logo";
import NavigationItems from "../NavigationItems/NavigationItems";

import "./MainNavigation.css";

import AuthContext from "../../../context/auth/authContext";

const MainNavigation = ({ onOpenMobileNav, isAuth, onLogout }) => {
  const authContext = useContext(AuthContext);
  const { loadUser, user } = authContext;

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <nav className="main-nav">
      <MobileToggle onOpen={onOpenMobileNav} />
      <div className="main-nav__logo">
        <NavLink to="/">
          <Logo />
        </NavLink>
      </div>
      <div className="spacer" />
      <div className="main-nav__logo">
        <NavLink to="/">
          <h1>{user ? `${user.email}:${user.name}` : "loading..."}</h1>
        </NavLink>
      </div>
      <div className="spacer" />
      <ul className="main-nav__items">
        <NavigationItems isAuth={isAuth} onLogout={onLogout} />
      </ul>
    </nav>
  );
};

export default MainNavigation;
