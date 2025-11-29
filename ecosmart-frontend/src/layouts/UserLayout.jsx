import { Outlet } from 'react-router-dom'

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <Outlet />
    </div>
  )
}

export default UserLayout

