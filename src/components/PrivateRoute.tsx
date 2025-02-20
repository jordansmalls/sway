import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const PrivateRoute: React.FC = () => {
  // Get the userInfo from the Redux store with proper typing
  const { userInfo } = useSelector((state: RootState) => state.auth);

  // If userInfo exists, render the child routes
  // Otherwise, redirect to the login page
  return userInfo ? <Outlet /> : <Navigate to='/login' replace />;
};

export default PrivateRoute;

