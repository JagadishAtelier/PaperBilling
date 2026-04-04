// controllers/report.controller.js
import reportService from "../service/report.service.js";

const reportController = {
  /**
   * Get sales report
   * Query params: period (today|this_month|this_year|custom), startDate, endDate
   */
  async getSalesReport(req, res) {
    try {
      const { period = 'today', startDate, endDate, branch_id } = req.query;
      
      // Get branch_ids from branchContext (populated by authenticateBranch middleware)
      let branch_ids = [];
      
      if (req.branchContext) {
        if (req.branchContext.multipleBranches && req.branchContext.branches) {
          // User has multiple branches
          const userBranchIds = req.branchContext.branches.map(b => b.branchId);
          
          // If specific branch_id provided, validate user has access and use only that branch
          if (branch_id) {
            if (userBranchIds.includes(branch_id)) {
              branch_ids = [branch_id];
              console.log(`User selected specific branch: ${branch_id}`);
            } else {
              return res.status(403).json({
                success: false,
                message: "You don't have access to the selected branch"
              });
            }
          } else {
            // No specific branch selected, use all user's branches
            branch_ids = userBranchIds;
            console.log(`User viewing all branches: ${branch_ids.join(', ')}`);
          }
        } else if (req.branchContext.branchId) {
          // User has single branch
          branch_ids = [req.branchContext.branchId];
        }
      }
      
      console.log('Report - branchContext:', req.branchContext);
      console.log('Report - final branch_ids:', branch_ids);
      
      if (!branch_ids || branch_ids.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No branches assigned to user"
        });
      }

      // Validate period
      const validPeriods = ['today', 'this_month', 'this_year', 'custom'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          message: "Invalid period. Must be: today, this_month, this_year, or custom"
        });
      }

      // Validate custom date range
      if (period === 'custom') {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: "startDate and endDate are required for custom period"
          });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format"
          });
        }
        
        if (start > end) {
          return res.status(400).json({
            success: false,
            message: "startDate cannot be after endDate"
          });
        }
      }

      const report = await reportService.getSalesReport({
        period,
        startDate,
        endDate,
        branch_ids
      });

      return res.status(200).json({
        success: true,
        data: report,
        message: "Sales report generated successfully"
      });
    } catch (error) {
      console.error("Error generating sales report:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate sales report"
      });
    }
  }
};

export default reportController;
