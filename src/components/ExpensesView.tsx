import React, { useState, useEffect } from "react";
import { Plus, Receipt, User, Users, Check, AlertCircle, Trash2, CreditCard, Globe } from "lucide-react";
import { Itinerary, Expense, Settlement } from "../types";
import { INITIAL_EXPENSES, INITIAL_SETTLEMENTS, AVATARS } from "../data";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ExpensesViewProps {
  itinerary?: Itinerary;
}

export default function ExpensesView({ itinerary }: ExpensesViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [settlements, setSettlements] = useState<Settlement[]>(INITIAL_SETTLEMENTS);

  // Currency Converter State
  const [homeCurrency, setHomeCurrency] = useState<string>("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    INR: 1.0,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AUD: 0.018,
    CAD: 0.016,
    SGD: 0.016,
    JPY: 1.85,
  });
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    async function fetchRates() {
      try {
        setRatesLoading(true);
        const res = await fetch("https://open.er-api.com/v6/latest/INR");
        const data = await res.json();
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (err) {
        console.error("Exchange rates fetch failed, using fallbacks:", err);
      } finally {
        setRatesLoading(false);
      }
    }
    fetchRates();
  }, []);

  const formatConverted = (inrAmount: number) => {
    if (homeCurrency === "INR") return "";
    const rate = exchangeRates[homeCurrency] || 1;
    const converted = inrAmount * rate;
    const symbolMap: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      AUD: "A$",
      CAD: "C$",
      SGD: "S$",
      JPY: "¥"
    };
    const symbol = symbolMap[homeCurrency] || "";
    const decimals = homeCurrency === "JPY" ? 0 : 2;
    return ` (${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${homeCurrency})`;
  };

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("Arjun");
  const [category, setCategory] = useState<"food" | "transport" | "tickets" | "other">("food");

  // Dynamic cost calculations
  const totalTripCost = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const userPaid = expenses.filter(e => e.paidBy === "Arjun").reduce((acc, curr) => acc + curr.amount, 0);
  const perPersonCost = totalTripCost / 4; // Assuming 4 travelers
  const userShare = perPersonCost;

  const tripId = itinerary?.id || "hampi-heritage-trail";
  const estimatedBudget = itinerary?.estimatedBudget || 25000;

  // Master Target Budget for the trip with Local Storage sync
  const [targetBudget, setTargetBudget] = useState<number>(() => {
    const saved = localStorage.getItem(`wanderway_target_budget_${tripId}`);
    return saved ? Number(saved) : estimatedBudget;
  });

  // Category Target Budgets State with Local Storage sync
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`wanderway_budgets_${tripId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    const initialBudget = Number(localStorage.getItem(`wanderway_target_budget_${tripId}`)) || estimatedBudget;
    return {
      food: Math.round(initialBudget * 0.25),
      transport: Math.round(initialBudget * 0.30),
      tickets: Math.round(initialBudget * 0.25),
      other: Math.round(initialBudget * 0.20),
    };
  });

  // Handler for master target budget slider updates
  const handleTargetBudgetChange = (newBudget: number) => {
    setTargetBudget(newBudget);
    localStorage.setItem(`wanderway_target_budget_${tripId}`, String(newBudget));
    setCategoryBudgets({
      food: Math.round(newBudget * 0.25),
      transport: Math.round(newBudget * 0.30),
      tickets: Math.round(newBudget * 0.25),
      other: Math.round(newBudget * 0.20),
    });
  };

  // Keep target budgets up to date when trip changes or gets saved
  useEffect(() => {
    localStorage.setItem(`wanderway_budgets_${tripId}`, JSON.stringify(categoryBudgets));
  }, [categoryBudgets, tripId]);

  // Aggregate expenses for Recharts Pie Chart
  const categoryTotals = expenses.reduce((acc, curr) => {
    const cat = curr.category || "other";
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    food: "Dining",
    transport: "Transport",
    tickets: "Activities",
    other: "Other"
  };

  // Generate real-time warnings for exceeding 80% or 100% of limits
  const budgetAlerts = Object.keys(categoryLabels).map(cat => {
    const spent = categoryTotals[cat] || 0;
    const limit = categoryBudgets[cat] || 1;
    const ratio = spent / limit;
    const percent = Math.round(ratio * 100);
    return {
      category: cat,
      label: categoryLabels[cat],
      spent,
      limit,
      percent,
      isTriggered: ratio >= 0.8 && ratio < 1.0,
      isExceeded: ratio >= 1.0,
    };
  });

  const chartData = Object.keys(categoryTotals).map(cat => ({
    name: categoryLabels[cat] || cat,
    value: categoryTotals[cat],
    category: cat
  }));

  const COLORS: Record<string, string> = {
    food: "#E8A66B",      // warm orange
    transport: "#4FA8E0", // sky blue
    tickets: "#3ACBB8",   // emerald/teal
    other: "#8FBF7F"      // light green
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount.trim()) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      category,
      title,
      paidBy,
      amount: Number(amount),
      date: "Just now",
      avatars: paidBy === "Arjun" 
        ? [AVATARS.arjun, AVATARS.priya, AVATARS.rahul, AVATARS.sarah]
        : paidBy === "Priya" ? [AVATARS.priya, AVATARS.arjun] : [AVATARS.rahul, AVATARS.arjun]
    };

    setExpenses([newExpense, ...expenses]);

    // Recalculate settlement amounts dynamically
    if (paidBy === "Arjun") {
      // Add debt to other people
      setSettlements(prev => prev.map(s => {
        if (!s.settled) {
          return { ...s, amount: s.amount + (Number(amount) / 4) };
        }
        return s;
      }));
    }

    // Reset Form
    setTitle("");
    setAmount("");
    setPaidBy("Arjun");
    setCategory("food");
    setShowAddModal(false);
  };

  const handleSettleDebt = (settlementId: string) => {
    setSettlements(prev => prev.map(s => {
      if (s.id === settlementId) {
        return { ...s, settled: true };
      }
      return s;
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const getCatColor = (cat: string) => {
    switch (cat) {
      case "food": return "bg-orange-50 text-orange-500 border-orange-100";
      case "transport": return "bg-sky-50 text-sky-500 border-sky-100";
      case "tickets": return "bg-emerald-50 text-emerald-500 border-emerald-100";
      default: return "bg-purple-50 text-purple-500 border-purple-100";
    }
  };

  return (
    <div id="expenses-screen" className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Trip Expenses & Splits
          </h1>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Keep track of shared spending, bills, transport tabs, and instant settlements.
          </p>
        </div>

        {/* Home Currency Converter widget */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 shrink-0">
          <Globe className="w-4 h-4 text-emerald-600 animate-pulse" />
          <div className="flex flex-col">
            <span className="font-sans text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none">Home Currency</span>
            <select
              value={homeCurrency}
              onChange={(e) => setHomeCurrency(e.target.value)}
              className="bg-transparent font-display font-bold text-xs text-slate-800 outline-none cursor-pointer mt-0.5 border-none p-0 pr-6"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          {ratesLoading && <span className="text-[10px] text-slate-400">...</span>}
        </div>
      </div>

      {/* Top Summary Card with Earth Orange Secondary Gradient */}
      <section className="bg-gradient-to-r from-[#E8A66B] to-[#D9895B] rounded-[24px] p-6 md:p-8 text-white shadow-xl shadow-orange-100/10 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="space-y-1.5 md:border-r border-white/20 md:pr-6">
          <span className="block text-[10px] uppercase font-bold text-white/80 tracking-widest">Total Trip Cost</span>
          <h2 className="font-display font-extrabold text-3xl">
            ₹{totalTripCost.toLocaleString()}
            <span className="text-sm font-semibold opacity-90 block mt-1">
              {formatConverted(totalTripCost)}
            </span>
          </h2>
          <span className="text-[11px] text-white/90">Split equally among 4 people</span>
        </div>

        <div className="space-y-1.5 md:border-r border-white/20 md:px-6">
          <span className="block text-[10px] uppercase font-bold text-white/80 tracking-widest">Your Shared Cost</span>
          <h2 className="font-display font-extrabold text-3xl">
            ₹{userShare.toLocaleString()}
            <span className="text-sm font-semibold opacity-90 block mt-1">
              {formatConverted(userShare)}
            </span>
          </h2>
          <span className="text-[11px] text-white/95">Based on ₹{perPersonCost.toLocaleString()} per head</span>
        </div>

        <div className="space-y-1.5 md:pl-6">
          <span className="block text-[10px] uppercase font-bold text-white/80 tracking-widest">You Have Paid</span>
          <h2 className="font-display font-extrabold text-3xl">
            ₹{userPaid.toLocaleString()}
            <span className="text-sm font-semibold opacity-90 block mt-1">
              {formatConverted(userPaid)}
            </span>
          </h2>
          <span className="text-[11px] text-white/95">
            {userPaid > userShare 
              ? `You're owed ₹${(userPaid - userShare).toLocaleString()}${formatConverted(userPaid - userShare)}` 
              : `You owe ₹${(userShare - userPaid).toLocaleString()}${formatConverted(userShare - userPaid)}`}
          </span>
        </div>
      </section>

      {/* Main Grid split */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Recent Expenses & Spending Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Spending Breakdown Pie Chart Card (Horizontal Layout) */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 px-1">
              Spending Breakdown
            </h3>

            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
              {/* Left side: Pie Chart */}
              <div className="w-full md:w-1/2 h-48 relative shrink-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.category] || "#94A3B8"} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Amount"]}
                        contentStyle={{ 
                          borderRadius: "12px", 
                          border: "1px solid #E2E8F0", 
                          fontFamily: "Inter, sans-serif", 
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: "#fff"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-sans text-xs">
                    No expense data recorded.
                  </div>
                )}

                {/* Total Cost Display in Center of Donut Chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none">TOTAL SPENT</span>
                  <span className="text-lg font-display font-black text-slate-800 mt-1">₹{totalTripCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Right side: Chart Legend with Percentages (Grid-based list) */}
              <div className="w-full md:w-1/2 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-8 self-stretch">
                <span className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Expense Distribution
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {chartData.map((entry, index) => {
                    const pct = totalTripCost > 0 ? (entry.value / totalTripCost) * 100 : 0;
                    return (
                      <div key={index} className="flex items-start gap-2.5 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded shrink-0 mt-1"
                          style={{ backgroundColor: COLORS[entry.category] || "#94A3B8" }}
                        />
                        <div className="min-w-0 leading-none">
                          <span className="block font-sans text-[11px] font-bold text-slate-700 truncate leading-tight">
                            {entry.name}
                          </span>
                          <span className="block font-mono text-[9.5px] text-slate-400 font-semibold mt-1">
                            ₹{entry.value.toLocaleString()} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-display font-bold text-base text-slate-900">
                Recent Expenses
              </h3>
              
              <button
                id="add-expense-modal-trigger"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#4FA8E0] hover:bg-[#3db3e6] text-white rounded-xl font-display font-bold text-xs shadow-md shadow-sky-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Add Expense</span>
              </button>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
              {expenses.map((exp) => (
                <div key={exp.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getCatColor(exp.category)}`}>
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-slate-900 truncate">
                        {exp.title}
                      </h4>
                      <p className="font-sans text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>Paid by <strong>{exp.paidBy}</strong></span>
                        <span>•</span>
                        <span>{exp.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Share Avatars */}
                    <div className="hidden md:flex -space-x-1.5">
                      {exp.avatars.map((av, avIdx) => (
                        <img key={avIdx} src={av} alt="participant" className="w-6 h-6 rounded-full border border-white object-cover" />
                      ))}
                    </div>

                    <div className="text-right">
                      <span className="block font-display font-bold text-sm text-slate-700">
                        ₹{exp.amount.toLocaleString()}
                        <span className="text-[11px] text-emerald-600 block sm:inline sm:ml-1 font-semibold">
                          {formatConverted(exp.amount)}
                        </span>
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        ₹{(exp.amount / (exp.avatars.length || 1)).toFixed(0)} / head
                        {homeCurrency !== "INR" && (
                          <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                            {formatConverted(exp.amount / (exp.avatars.length || 1)).replace(" (", "").replace(")", "")} / head
                          </span>
                        )}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity p-1 cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlements card relocated to fill empty space */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 px-1">
              Settlements
            </h3>

            <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4 font-sans">
              <span className="block text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-wider">
                Group Balance Sheets & Payments
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settlements.map((set) => (
                  <div 
                    key={set.id} 
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      set.settled 
                        ? "bg-slate-50/50 border-slate-100 opacity-60" 
                        : "bg-amber-50/15 border-amber-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={set.avatar} alt={set.debtor} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="block font-display font-bold text-xs text-slate-900">
                          {set.debtor}
                        </span>
                        <span className="block font-sans text-[10px] text-slate-500 font-medium">
                          {set.settled ? "Settled Up" : "Owes you"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`block font-display font-bold text-sm ${
                          set.settled ? "text-slate-400 line-through" : "text-[#D9895B]"
                        }`}>
                          ₹{set.amount.toLocaleString()}
                        </span>
                        {!set.settled && homeCurrency !== "INR" && (
                          <span className="block text-[9px] text-emerald-600 font-semibold leading-none mt-0.5">
                            {formatConverted(set.amount).replace(" (", "").replace(")", "")}
                          </span>
                        )}
                      </div>

                      {!set.settled && (
                        <button
                          onClick={() => handleSettleDebt(set.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Mark as Settled"
                        >
                          <Check className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => alert("Settlements summaries shared in the group chat!")}
                className="w-full bg-[#E8A66B] hover:bg-[#d9895b] text-white py-3 rounded-xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>Settle All Debts</span>
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Budget Limits & Alerts Sidebar List */}
        <div className="space-y-6">
          
          {/* Proactive Budget Limits & Alerts System Card (Now positioned upwards) */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 px-1">
              Budget Limits & Alerts
            </h3>

            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-5">
              
              {/* Proactive threshold alerts list */}
              <div className="space-y-2.5">
                {budgetAlerts.some(a => a.isTriggered || a.isExceeded) ? (
                  budgetAlerts.map((alert) => {
                    if (alert.isExceeded) {
                      return (
                        <div key={alert.category} className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-sans">
                          <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-0.5">
                            <span className="font-bold">🚨 Budget Exceeded! ({alert.label})</span>
                            <p className="text-slate-600 font-light text-[10px] leading-tight">
                              You spent ₹{alert.spent.toLocaleString()} which is {alert.percent}% of your ₹{alert.limit.toLocaleString()} target limit!
                            </p>
                          </div>
                        </div>
                      );
                    } else if (alert.isTriggered) {
                      return (
                        <div key={alert.category} className="bg-amber-50 border border-amber-200 text-amber-850 px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-sans">
                          <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold">⚠️ Threshold Warning Reached! ({alert.label})</span>
                            <p className="text-slate-600 font-light text-[10px] leading-tight">
                              Spending has exceeded the 80% threshold (currently {alert.percent}%, spent ₹{alert.spent.toLocaleString()} of ₹{alert.limit.toLocaleString()}).
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <div className="bg-emerald-50/40 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-sans font-medium">
                    <Check className="w-4.5 h-4.5 text-emerald-600" />
                    <span>All categories are within 80% budget limit!</span>
                  </div>
                )}
              </div>

              {/* Master Trip Budget Slider */}
              <div className="border-b border-slate-100 pb-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                    Master Trip Target Budget
                  </span>
                  <span className="bg-[#4FA8E0]/15 text-[#3b9bd7] font-mono font-extrabold text-xs px-2.5 py-1 rounded-full border border-[#4FA8E0]/20">
                    ₹{targetBudget.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={5000}
                    max={100000}
                    step={1000}
                    value={targetBudget}
                    onChange={(e) => handleTargetBudgetChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4FA8E0] transition-all hover:bg-slate-200"
                  />
                  <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400">
                    <span>₹5,000 Min</span>
                    <span>₹50,000 Mid</span>
                    <span>₹100,000 Max</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-450 font-sans leading-tight">
                  Drag the slider to adjust the total target. This instantly reallocates Dine-In (25%), Transport (30%), Activities (25%), and Other (20%) limits.
                </p>
              </div>

              {/* Progress and Category Budgets Target list */}
              <div className="space-y-4">
                <span className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                  Category Progress & Custom Targets
                </span>

                <div className="space-y-3.5">
                  {Object.keys(categoryLabels).map((cat) => {
                    const spent = categoryTotals[cat] || 0;
                    const target = categoryBudgets[cat] || 1;
                    const pct = Math.min(100, (spent / target) * 100);
                    const isAlert = spent / target >= 0.8;
                    const isOver = spent / target >= 1.0;

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-[11px] font-sans">
                          <span className="font-bold text-slate-700">{categoryLabels[cat]}</span>
                          <span className="font-mono text-slate-500">
                            ₹{spent.toLocaleString()} / <span className="font-bold text-slate-700">₹{target.toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: isOver ? "#EF4444" : isAlert ? "#F59E0B" : (COLORS[cat] || "#10B981") 
                            }}
                          />
                        </div>

                        {/* Editable Target Budgets */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[9px] text-slate-450 font-medium">Adjust limit (₹):</span>
                          <input 
                            type="number"
                            value={target}
                            min={1}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setCategoryBudgets(prev => ({
                                ...prev,
                                [cat]: val
                              }));
                            }}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 focus:bg-white focus:border-[#4FA8E0] outline-none text-right transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>


        </div>

      </section>

      {/* Dynamic Add Expense dialog overlay modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 w-full max-w-[420px] space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#4A8B5C]" />
                <span>Add Group Expense</span>
              </h4>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Expense Name
                </label>
                <input 
                  id="modal-expense-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner, Rickshaw, Entrance tickets"
                  className="w-full bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-900 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Amount (₹ INR)
                  </label>
                  <input 
                    id="modal-expense-amount"
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-900 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-700 outline-none transition-all"
                  >
                    <option value="food">🍽️ Food</option>
                    <option value="transport">🚗 Transport</option>
                    <option value="tickets">🎫 Entry Fees</option>
                    <option value="other">⚙️ Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Paid By
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-700 outline-none transition-all"
                >
                  <option value="Arjun">Arjun (You)</option>
                  <option value="Priya">Priya</option>
                  <option value="Rahul">Rahul</option>
                </select>
              </div>

              <button 
                id="modal-expense-save-btn"
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white rounded-xl font-display font-semibold text-sm shadow-md transition-all cursor-pointer"
              >
                Save Expense
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
