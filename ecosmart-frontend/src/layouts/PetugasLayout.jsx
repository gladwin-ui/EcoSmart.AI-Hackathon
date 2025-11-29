import { Outlet } from 'react-router-dom'
import PetugasNavbar from '../pages/petugas/components/PetugasNavbar'

const PetugasLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      <PetugasNavbar />
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  )
}

export default PetugasLayout

