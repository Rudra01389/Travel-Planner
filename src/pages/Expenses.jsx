import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { CATEGORIES, CATEGORY_COLORS } from "../data/sampleData";
import { formatINR, formatLakh, formatShortDate } from "../utils/format";

const FLEX_COLOR = "#f0ead9";

export default function Expenses() {
  const { id } = useParams();
  const { getTrip, addExpense, removeExpense } = useTrips();
  const trip = getTrip(id);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: CATEGORIES[0],
    amount: "",
  });

  if (!trip) {
    return (
      <div className="content">
        <p className="empty-note">
          Trip not found. <a href="/">Back to dashboard</a>
        </p>
      </div>
    );
  }

  const spentByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = trip.expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
    return acc;
  }, {});

  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const budget = Number(trip.budget) || totalSpent;
  const flexRemaining = Math.max(0, budget - totalSpent);
  const barTotal = Math.max(budget, totalSpent);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    addExpense(trip.id, {
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount),
    });
    setForm((f) => ({ ...f, description: "", amount: "" }));
  }

  const sortedTx = [...trip.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="content">
      <div className="exp-header">
        <span className="eyebrow">{trip.destination.toUpperCase()}</span>
        <div className="top-row">
          <h1>Expenses</h1>
          <span className="meta">
            {trip.startDate && trip.endDate
              ? `${formatShortDate(trip.startDate)} – ${formatShortDate(trip.endDate)}`
              : "Not yet dated"}
          </span>
        </div>
      </div>

      <div className="card card-peach budget-summary">
        <h2>Your budget, balanced.</h2>
        <p className="breakdown-line">
          {CATEGORIES.map((cat) => `${cat} ${formatINR(spentByCategory[cat])}`).join(" · ")} — of{" "}
          {formatLakh(budget)} total.
        </p>
        <div className="budget-bar">
          {CATEGORIES.map((cat) =>
            spentByCategory[cat] > 0 ? (
              <span
                key={cat}
                className="seg"
                style={{
                  width: `${(spentByCategory[cat] / barTotal) * 100}%`,
                  background: CATEGORY_COLORS[cat],
                }}
              />
            ) : null
          )}
          {flexRemaining > 0 && (
            <span
              className="seg"
              style={{ width: `${(flexRemaining / barTotal) * 100}%`, background: FLEX_COLOR }}
            />
          )}
        </div>
        <div className="budget-legend">
          {CATEGORIES.map((cat) => (
            <span className="item" key={cat}>
              <span className="dot" style={{ background: CATEGORY_COLORS[cat] }} />
              {cat}
            </span>
          ))}
          <span className="item">
            <span className="dot" style={{ background: FLEX_COLOR }} />
            Flex fund
          </span>
        </div>
      </div>

      <div className="section-title-row">
        <h2>All transactions</h2>
      </div>
      <table className="tx-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th className="num">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedTx.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-note">
                No expenses logged yet.
              </td>
            </tr>
          )}
          {sortedTx.map((tx) => (
            <tr key={tx.id}>
              <td>{formatShortDate(tx.date)}</td>
              <td>{tx.description}</td>
              <td className="cat">{tx.category}</td>
              <td className="num">{formatINR(tx.amount)}</td>
              <td className="del">
                <button onClick={() => removeExpense(trip.id, tx.id)} aria-label="Remove expense">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="add-expense-form" onSubmit={handleAdd}>
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="field">
          <label>Description</label>
          <input
            type="text"
            placeholder="e.g. Dinner in town"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Amount</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>
    </div>
  );
}
