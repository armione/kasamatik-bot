// src/pages/AdminPage.tsx
import AddSpecialOddForm from '../components/admin/AddSpecialOddForm';
import ResultSpecialOdds from '../components/admin/ResultSpecialOdds';

const AdminPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Yönetim Paneli</h1>
        <p className="mt-1 text-gray-400">Özel oranları yönetin ve sonuçlandırın.</p>
      </div>
      
      <ResultSpecialOdds />
      <AddSpecialOddForm />
    </div>
  );
};

export default AdminPage;
