import customerModel from "../model/customerModel.js";
import transporterModel from "../model/transporterModel.js";
import temporaryTransporterModel from "../model/temporaryTransporterModel.js";

/**
 * GET /api/admin/customers
 * Get all customers with pagination and search
 */
export const getAllCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    // Build query
    let query = {};

    // Search by name, email, or company
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { companyName: searchRegex },
      ];
    }

    // Filter by subscription status
    if (status === 'subscribed') {
      query.isSubscribed = true;
    } else if (status === 'unsubscribed') {
      query.isSubscribed = false;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const customers = await customerModel
      .find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await customerModel.countDocuments(query);

    // Get statistics
    const stats = {
      total: await customerModel.countDocuments(),
      subscribed: await customerModel.countDocuments({ isSubscribed: true }),
      unsubscribed: await customerModel.countDocuments({ isSubscribed: false }),
    };

    return res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
    });
  }
};

/**
 * GET /api/admin/customers/:id
 * Get single customer details
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerModel.findById(id).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('[Admin] Error fetching customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
    });
  }
};

/**
 * PUT /api/admin/customers/:id/subscription
 * Toggle customer subscription status
 */
export const updateCustomerSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSubscribed } = req.body;

    const customer = await customerModel.findByIdAndUpdate(
      id,
      { isSubscribed: Boolean(isSubscribed) },
      { new: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Customer subscription ${isSubscribed ? 'activated' : 'deactivated'} successfully`,
      data: customer,
    });
  } catch (error) {
    console.error('[Admin] Error updating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription status',
    });
  }
};

/**
 * PUT /api/admin/customers/:id
 * Update customer details
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates._id;

    const customer = await customerModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    console.error('[Admin] Error updating customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer',
    });
  }
};

/**
 * DELETE /api/admin/customers/:id
 * Delete customer account
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerModel.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Also delete their temporary transporters
    await temporaryTransporterModel.deleteMany({ customerID: id });

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('[Admin] Error deleting customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
    });
  }
};

/**
 * GET /api/admin/transporters
 * Get all main transporters
 */
export const getAllTransporters = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    // Build query
    let query = {};

    // Search by company name or email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { companyName: searchRegex },
        { email: searchRegex },
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transporters = await transporterModel
      .find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await transporterModel.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        transporters,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching transporters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transporters',
    });
  }
};

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
export const getPlatformStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      subscribedCustomers,
      totalTransporters,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
    ] = await Promise.all([
      customerModel.countDocuments(),
      customerModel.countDocuments({ isSubscribed: true }),
      transporterModel.countDocuments(),
      temporaryTransporterModel.countDocuments({ approvalStatus: 'pending' }),
      temporaryTransporterModel.countDocuments({ approvalStatus: 'approved' }),
      temporaryTransporterModel.countDocuments({ approvalStatus: 'rejected' }),
    ]);

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCustomers = await customerModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentVendors = await temporaryTransporterModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          subscribed: subscribedCustomers,
          unsubscribed: totalCustomers - subscribedCustomers,
          recentSignups: recentCustomers,
        },
        vendors: {
          pending: pendingVendors,
          approved: approvedVendors,
          rejected: rejectedVendors,
          total: pendingVendors + approvedVendors + rejectedVendors,
          recentAdditions: recentVendors,
        },
        transporters: {
          total: totalTransporters,
        },
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform statistics',
    });
  }
};
