// src/components/Navbar.js
import React, { useEffect, useState } from 'react';
import { Navbar as BSNavbar, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import '../styles/Navbar.css'; // Import the CSS file

const Navbar = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthenticated(!!currentUser);
      setUser(currentUser); // Store the user object to access displayName and email
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Get display name or fall back to email or 'User'
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <BSNavbar bg="primary" variant="dark" expand="lg" className="navbar-custom">
      <BSNavbar.Brand href="/" className="navbar-brand" style={{ color: 'red' }}>
        Quiz<span style={{ color: 'red' }}>Master</span>
      </BSNavbar.Brand>
      <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BSNavbar.Collapse id="basic-navbar-nav">
        <Nav className="ms-auto align-items-center">
          <Nav.Link href="/create-quiz" className="nav-link-custom">
                  Create Quiz
          </Nav.Link>
          <Nav.Link href="/ai-quiz" className="nav-link-custom">
                  AI Quiz
          </Nav.Link>
          {isAuthenticated ? (
            <>
              <Nav.Link href="/dashboard" className="nav-link-custom">
                Dashboard
              </Nav.Link>
              <div className="profile-container">
                <span className="profile-btn">{displayName}</span>
                <div className="profile-card">
                  <p>Welcome! {user?.email || 'No email'}</p>
                </div>
              </div>
              <Nav.Link onClick={handleLogout} className="nav-link-custom">
                Logout
              </Nav.Link>
            </>
          ) : (
            <>
              <Nav.Link href="/signup" className="nav-link-custom">
                Signup
              </Nav.Link>
              <Nav.Link href="/login" className="nav-link-custom">
                Login
              </Nav.Link>
            </>
          )}
        </Nav>
      </BSNavbar.Collapse>
    </BSNavbar>
  );
};

export default Navbar;