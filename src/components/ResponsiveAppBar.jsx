import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import AdbIcon from '@mui/icons-material/Adb';

// Optional for React Router:
// import { Link } from 'react-router-dom';

const navItems = [
  {
    label: 'Projects',
    children: [
      // { label: 'Interlining', to: '/web-projects/interlining' },
      { label: 'Delaunay Triangulation', to: '/web-projects/delaunay' },
      { label: 'Medial Axis Approximation', to: '/web-projects/medial-axis' },
    ],
  },
  // { label: 'Pricing', to: '/pricing' },
  // { label: 'Blog', to: '/blog' },
];

export default function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const [anchorElProjects, setAnchorElprojects] = React.useState(null);

  const openprojects = Boolean(anchorElProjects);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenProjects = (event) => {
    setAnchorElprojects(event.currentTarget);
  };

  const handleCloseProjects = () => {
    setAnchorElprojects(null);
  };

  const projects = navItems.find((i) => i.label === 'Projects');

  return (
    <AppBar position="sticky">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          {/* <AdbIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} /> */}
          <Typography
            variant="h6"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              // letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Sean Stockman
          </Typography>

          {/* Mobile hamburger */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>

            <Menu
              anchorEl={anchorElNav}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
            >
              {navItems.map((item) =>
                item.children ? (
                  <React.Fragment key={item.label}>
                    <MenuItem disabled>
                      <Typography fontWeight="bold">
                        {item.label}
                      </Typography>
                    </MenuItem>

                    {item.children.map((child) => (
                      <MenuItem
                        key={child.label}
                        onClick={handleCloseNavMenu}
                        component="a"
                        href={child.to}
                        sx={{ pl: 4 }}
                      >
                        {child.label}
                      </MenuItem>
                    ))}
                  </React.Fragment>
                ) : (
                  <MenuItem
                    key={item.label}
                    onClick={handleCloseNavMenu}
                    component="a"
                    href={item.to}
                  >
                    {item.label}
                  </MenuItem>
                )
              )}
            </Menu>
          </Box>

          {/* Mobile logo */}
          {/* <AdbIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} /> */}
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              display: { xs: 'flex', md: 'none' },
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            Sean Stockman
          </Typography>

          {/* Desktop nav */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) =>
              item.children ? (
                <Button
                  key={item.label}
                  onClick={handleOpenProjects}
                  sx={{ my: 2, color: 'white' }}
                >
                  {item.label}
                </Button>
              ) : (
                <Button
                  key={item.label}
                  component="a"
                  href={item.to}
                  sx={{ my: 2, color: 'white' }}
                >
                  {item.label}
                </Button>
              )
            )}
          </Box>

          {/* projects dropdown */}
          <Menu
            anchorEl={anchorElProjects}
            open={openprojects}
            onClose={handleCloseProjects}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            {projects?.children.map((child) => (
              <MenuItem
                key={child.label}
                onClick={handleCloseProjects}
                component="a"
                href={child.to}
              >
                {child.label}
              </MenuItem>
            ))}
          </Menu>

          {/* User menu
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {['Profile', 'Account', 'Dashboard', 'Logout'].map((item) => (
                <MenuItem key={item} onClick={handleCloseUserMenu}>
                  {item}
                </MenuItem>
              ))}
            </Menu>
          </Box> */}
        </Toolbar>
      </Container>
    </AppBar>
  );
}