"use client";
import { useState, useEffect } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export default function ExpenseManager({ trip }) {
  const { user } = useUser();
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [percentageSplits, setPercentageSplits] = useState({});
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'food',
    paid_by: '',
    expense_type: 'split', // 'split' or 'individual'
    split_members: [],
    receipt_url: null
  });

  const categories = [
    { value: 'food', label: 'Food & Dining', icon: '🍽️' },
    { value: 'transport', label: 'Transportation', icon: '🚗' },
    { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
    { value: 'activities', label: 'Activities', icon: '🎪' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'other', label: 'Other', icon: '💰' }
  ];

  const splitTypes = [
    { value: 'equal', label: 'Split Equally' },
    { value: 'custom', label: 'Custom Split' },
    { value: 'percentage', label: 'By Percentage' }
  ];

  useEffect(() => {
    fetchExpenses();
    fetchMembers();
  }, [trip.id]);

  const fetchExpenses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/trips/${trip.id}/expenses`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      } else {
        console.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          users(id, name, avatar_url)
        `)
        .eq('trip_id', trip.id)
        .eq('status', 'active');

      if (error) throw error;
      setMembers(data?.map(m => m.users).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleAddExpense = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let splitMembers = [];
      let customSplitsData = {};

      if (newExpense.expense_type === 'individual') {
        // For individual expenses, only the person who paid
        splitMembers = [newExpense.paid_by || user.id];
      } else {
        // For split expenses, calculate splits based on type
        const totalAmount = parseFloat(newExpense.amount);
        
        if (splitType === 'equal') {
          splitMembers = newExpense.split_members;
        } else if (splitType === 'custom') {
          // Custom amounts
          splitMembers = newExpense.split_members;
          customSplitsData = customSplits;
        } else if (splitType === 'percentage') {
          // Percentage splits
          splitMembers = newExpense.split_members;
          newExpense.split_members.forEach(memberId => {
            const percentage = percentageSplits[memberId] || 0;
            customSplitsData[memberId] = (totalAmount * percentage) / 100;
          });
        }
      }

      const response = await fetch(`/api/trips/${trip.id}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          paid_by: newExpense.paid_by || user.id,
          split_members: splitMembers,
          split_type: splitType,
          custom_splits: customSplitsData
        })
      });

      if (response.ok) {
        // Reset form and refresh
        setNewExpense({
          description: '',
          amount: '',
          category: 'food',
          paid_by: '',
          expense_type: 'split',
          split_members: [],
          receipt_url: null
        });
        setSplitType('equal');
        setCustomSplits({});
        setPercentageSplits({});
        setShowAddExpense(false);
        fetchExpenses();
      } else {
        const errorData = await response.json();
        alert(`Failed to add expense: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    }
  };

  const generateExpenseReport = () => {
    // Calculate balances
    const balances = {};
    members.forEach(member => {
      balances[member.id] = { paid: 0, owes: 0, name: member.name };
    });

    expenses.forEach(expense => {
      // Add to paid amount
      if (balances[expense.paid_by]) {
        balances[expense.paid_by].paid += expense.amount;
      }

      // Add to owed amounts
      expense.expense_splits?.forEach(split => {
        if (balances[split.user_id]) {
          balances[split.user_id].owes += split.amount;
        }
      });
    });

    // Calculate net balances
    const netBalances = Object.entries(balances).map(([userId, data]) => ({
      userId,
      name: data.name,
      balance: data.paid - data.owes
    }));

    return { balances, netBalances };
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Helper function for currency formatting
      const formatCurrency = (amount) => `Rs ${Math.abs(amount).toFixed(2)}`;
      
      // Colors
      const primaryColor = [59, 130, 246]; // Blue
      const secondaryColor = [107, 114, 128]; // Gray
      const positiveColor = [34, 197, 94]; // Green
      const negativeColor = [239, 68, 68]; // Red
      
      // Header section with background
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`${trip.title}`, 20, 20);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Expense Report', 20, 30);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Date and summary info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, 50);
      
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 20, 56);
      doc.text(`Number of Expenses: ${expenses.length}`, 20, 62);
      
      let yPosition = 80;
      
      // Expenses section
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPosition - 5, 180, 10, 'F');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('EXPENSES', 20, yPosition);
      yPosition += 15;
      
      // Table headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Description', 20, yPosition);
      doc.text('Amount', 80, yPosition);
      doc.text('Category', 110, yPosition);
      doc.text('Paid By', 140, yPosition);
      doc.text('Date', 170, yPosition);
      
      // Header underline
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition + 2, 190, yPosition + 2);
      yPosition += 8;
      
      // Expenses data
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      expenses.forEach((expense, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, yPosition - 3, 180, 8, 'F');
        }
        
        doc.text(`${expense.description}`, 20, yPosition);
        doc.text(`${formatCurrency(expense.amount)}`, 80, yPosition);
        doc.text(`${expense.category}`, 110, yPosition);
        doc.text(`${expense.paid_by_user?.name || 'Unknown'}`, 140, yPosition);
        
        const expenseDate = new Date(expense.created_at || Date.now());
        doc.text(`${expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 170, yPosition);
        
        yPosition += 8;
      });
      
      // Balance summary section
      const { netBalances } = generateExpenseReport();
      yPosition += 15;
      
      // Check if we need a new page
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Balance section header
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPosition - 5, 180, 10, 'F');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('BALANCE SUMMARY', 20, yPosition);
      yPosition += 15;
      
      // Balance table headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Member', 20, yPosition);
      doc.text('Balance', 80, yPosition);
      doc.text('Status', 120, yPosition);
      
      // Header underline
      doc.line(20, yPosition + 2, 150, yPosition + 2);
      yPosition += 8;
      
      // Balance data
      doc.setFont('helvetica', 'normal');
      
      netBalances.forEach((balance, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, yPosition - 3, 140, 8, 'F');
        }
        
        // Member name
        doc.setTextColor(0, 0, 0);
        doc.text(`${balance.name}`, 20, yPosition);
        
        // Balance amount with color coding
        const isPositive = balance.balance >= 0;
        doc.setTextColor(
          isPositive ? positiveColor[0] : negativeColor[0],
          isPositive ? positiveColor[1] : negativeColor[1],
          isPositive ? positiveColor[2] : negativeColor[2]
        );
        
        const balanceText = isPositive ? 
          `+${formatCurrency(balance.balance)}` : 
          `-${formatCurrency(balance.balance)}`;
        doc.text(balanceText, 80, yPosition);
        
        // Status
        const statusText = isPositive ? 'Owed' : 'Owes';
        doc.text(statusText, 120, yPosition);
        
        yPosition += 8;
      });
      
      // Footer
      yPosition += 20;
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Report generated by GlobeTrotter on ${new Date().toLocaleString('en-US')}`, 20, yPosition);
      
      // Page numbers (for multi-page reports)
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Page ${i} of ${pageCount}`, 180, 285, { align: 'right' });
      }
      
      // Save the PDF
      doc.save(`${trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-expense-report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const { netBalances } = generateExpenseReport();
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trip Expenses</h2>
            <p className="text-gray-600">Manage and split expenses for {trip.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">₹{totalExpenses.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Total Spent</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddExpense(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {netBalances.map(balance => (
            <div key={balance.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">{balance.name}</span>
              <span className={`font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance.balance >= 0 ? '+' : ''}₹{balance.balance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">No expenses recorded yet</p>
            <button
              onClick={() => setShowAddExpense(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map(expense => (
              <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {categories.find(c => c.value === expense.category)?.icon || '💰'}
                      </span>
                      <h4 className="font-medium text-gray-900">{expense.description}</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Paid by {expense.paid_by_user?.name || 'Unknown'} • {new Date(expense.created_at).toLocaleDateString()}
                    </p>
                    <div className="text-sm text-gray-600">
                      {expense.expense_splits?.length === 1 ? (
                        <span className="inline-flex items-center gap-1">
                          💳 Individual expense
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          🤝 Split among {expense.expense_splits?.length || 0} members
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">₹{expense.amount}</p>
                    <p className="text-sm text-gray-500 capitalize">{expense.category}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Expense</h3>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Dinner at restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <select
                    value={newExpense.paid_by}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, paid_by: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="expense_type"
                        value="individual"
                        checked={newExpense.expense_type === 'individual'}
                        onChange={(e) => setNewExpense(prev => ({ 
                          ...prev, 
                          expense_type: e.target.value,
                          split_members: e.target.value === 'individual' ? [] : prev.split_members
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">💳 Individual Expense (only for the person who paid)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="expense_type"
                        value="split"
                        checked={newExpense.expense_type === 'split'}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, expense_type: e.target.value }))}
                        className="mr-2"
                      />
                      <span className="text-sm">🤝 Split Expense (shared among selected members)</span>
                    </label>
                  </div>
                </div>

                {newExpense.expense_type === 'split' && (
                  <div className="space-y-4">
                    {/* Split Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="split_type"
                            value="equal"
                            checked={splitType === 'equal'}
                            onChange={(e) => setSplitType(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm">Equal Split</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="split_type"
                            value="custom"
                            checked={splitType === 'custom'}
                            onChange={(e) => setSplitType(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm">Custom Amounts</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="split_type"
                            value="percentage"
                            checked={splitType === 'percentage'}
                            onChange={(e) => setSplitType(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm">Percentage Split</span>
                        </label>
                      </div>
                    </div>

                    {/* Member Selection with Custom Inputs */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Split Among</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                        {members.map(member => (
                          <div key={member.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={newExpense.split_members.includes(member.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewExpense(prev => ({
                                    ...prev,
                                    split_members: [...prev.split_members, member.id]
                                  }));
                                  // Initialize custom splits
                                  if (splitType === 'custom') {
                                    setCustomSplits(prev => ({
                                      ...prev,
                                      [member.id]: 0
                                    }));
                                  } else if (splitType === 'percentage') {
                                    setPercentageSplits(prev => ({
                                      ...prev,
                                      [member.id]: 0
                                    }));
                                  }
                                } else {
                                  setNewExpense(prev => ({
                                    ...prev,
                                    split_members: prev.split_members.filter(id => id !== member.id)
                                  }));
                                  // Remove from custom splits
                                  setCustomSplits(prev => {
                                    const { [member.id]: removed, ...rest } = prev;
                                    return rest;
                                  });
                                  setPercentageSplits(prev => {
                                    const { [member.id]: removed, ...rest } = prev;
                                    return rest;
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm flex-1">{member.name}</span>
                            
                            {/* Custom Amount Input */}
                            {newExpense.split_members.includes(member.id) && splitType === 'custom' && (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Amount"
                                value={customSplits[member.id] || ''}
                                onChange={(e) => setCustomSplits(prev => ({
                                  ...prev,
                                  [member.id]: parseFloat(e.target.value) || 0
                                }))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            )}
                            
                            {/* Percentage Input */}
                            {newExpense.split_members.includes(member.id) && splitType === 'percentage' && (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  placeholder="0"
                                  value={percentageSplits[member.id] || ''}
                                  onChange={(e) => setPercentageSplits(prev => ({
                                    ...prev,
                                    [member.id]: parseFloat(e.target.value) || 0
                                  }))}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                                <span className="text-xs">%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Split Validation Messages */}
                      {splitType === 'custom' && newExpense.split_members.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="text-gray-600">
                            Total custom amounts: ${Object.values(customSplits).reduce((sum, amount) => sum + (amount || 0), 0).toFixed(2)}
                            {newExpense.amount && (
                              <span className={Object.values(customSplits).reduce((sum, amount) => sum + (amount || 0), 0) === parseFloat(newExpense.amount) ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                                (Expense: ${parseFloat(newExpense.amount || 0).toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {splitType === 'percentage' && newExpense.split_members.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="text-gray-600">
                            Total percentage: {Object.values(percentageSplits).reduce((sum, pct) => sum + (pct || 0), 0).toFixed(1)}%
                            <span className={Object.values(percentageSplits).reduce((sum, pct) => sum + (pct || 0), 0) === 100 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                              (Should total 100%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExpense}
                    disabled={
                      !newExpense.description || 
                      !newExpense.amount || 
                      (newExpense.expense_type === 'split' && (
                        newExpense.split_members.length === 0 ||
                        (splitType === 'custom' && Object.values(customSplits).reduce((sum, amount) => sum + (amount || 0), 0) !== parseFloat(newExpense.amount || 0)) ||
                        (splitType === 'percentage' && Object.values(percentageSplits).reduce((sum, pct) => sum + (pct || 0), 0) !== 100)
                      ))
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
