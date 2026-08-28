exports.toAdminResponse = (admin) => ({
  _id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  canManageUsers: admin.canManageUsers,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});
