const useRole = () => {
  const role = localStorage.getItem('userRole') || '';

  return {
    role,
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isSupervisor: role === 'supervisor',
    canWrite: role === 'admin' || role === 'operator',
    canDelete: role === 'admin',
    canManageUsers: role === 'admin',
    canManageSettings: role === 'admin',
  };
};

export default useRole;
