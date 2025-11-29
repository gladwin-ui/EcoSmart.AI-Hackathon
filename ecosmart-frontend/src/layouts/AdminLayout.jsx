import { Outlet } from 'react-router-dom'
import AdminSidebar from '../pages/admin/components/AdminSidebar'

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}

export default AdminLayout

