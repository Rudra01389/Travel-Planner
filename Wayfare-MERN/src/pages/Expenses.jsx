import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTrips } from "../context/TripsContext";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, CATEGORY_COLORS } from "../data/sampleData";
import { formatShortDate } from "../utils/format";
import { useMoney, money } from "../lib/money";
import CurrencyPicker, { RateNote } from "../components/CurrencyPicker";
import { expenseSchema } from "../lib/validation";
export default function Expenses() {
  const { id } = useParams(),
    { getTrip, addExpense, editExpense, removeExpense, updateBudget } =
      useTrips(),
    { user } = useAuth(),
    trip = getTrip(id);
  const conversion = useMoney(trip?.currency || "INR");
  const initial = () => ({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: CATEGORIES[0],
    amount: "",
    currency: trip?.currency || "INR",
    paidBy: user.id,
    splitBetween: [user.id],
  });
  const [form, setForm] = useState(initial),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [budget, setBudget] = useState("");
  if (!trip)
    return (
      <main className="content">
        <p>
          Trip not found. <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </main>
    );
  const base = trip.currency || "INR",
    spent = trip.expenses.reduce((s, e) => s + Number(e.amount), 0),
    byCategory = Object.fromEntries(
      CATEGORIES.map((c) => [
        c,
        trip.expenses
          .filter((e) => e.category === c)
          .reduce((s, e) => s + Number(e.amount), 0),
      ]),
    ),
    remaining = Number(trip.budget) - spent;
  const member = (id) =>
    trip.members.find((m) => m.id === id)?.name || "Former member";
  async function act(fn, msg) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(msg);
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content">
      <span className="eyebrow">{trip.destination}</span>
      <h1>Every expense, accounted for.</h1>
      <Link to={`/trips/${id}`}>← Back to trip</Link>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="toolbar">
        <CurrencyPicker
          value={conversion.display}
          onChange={conversion.setDisplay}
        />
      </div>
      <RateNote conversion={conversion} base={base} />
      <section className="card card-peach feature-card">
        <h2>{remaining < 0 ? "Over budget" : "Your budget, balanced."}</h2>
        <div className="budget-totals">
          <p>
            Total budget <strong>{conversion.format(trip.budget)}</strong>
          </p>
          <p>
            Spent <strong>{conversion.format(spent)}</strong>
          </p>
          <p>
            {remaining < 0 ? "Over budget by" : "Remaining"}{" "}
            <strong>{conversion.format(Math.abs(remaining))}</strong>
          </p>
        </div>
        <div className="budget-bar">
          {CATEGORIES.map((c) => (
            <span
              className="seg"
              key={c}
              style={{
                width: `${(byCategory[c] / Math.max(trip.budget, spent, 1)) * 100}%`,
                background: CATEGORY_COLORS[c],
              }}
            />
          ))}
        </div>
        <div className="budget-legend">
          {CATEGORIES.map((c) => (
            <span key={c}>
              {c}: {conversion.format(byCategory[c])}
            </span>
          ))}
        </div>
        {trip.ownerId === user.id && (
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await updateBudget(id, { budget: Number(budget) });
                setBudget("");
              }, "Budget updated.");
            }}
          >
            <label className="field">
              Update total budget ({base})
              <input
                type="number"
                required
                min={base === "JPY" ? 1 : 0.01}
                max={1e9}
                step={base === "JPY" ? 1 : 0.01}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <button disabled={busy} className="btn btn-ghost">
              Save budget
            </button>
          </form>
        )}
        <p className="meta">
          Display conversion does not change recorded amounts. The ledger and
          splits remain in {base}.
        </p>
      </section>
      <h2>Transactions</h2>
      <div className="table-scroll">
        <table className="tx-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category / payer</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!trip.expenses.length && (
              <tr>
                <td colSpan={5}>
                  No expenses yet. Add your first expense below.
                </td>
              </tr>
            )}
            {trip.expenses.map((e) => (
              <tr key={e.id}>
                <td>{formatShortDate(e.date)}</td>
                <td>
                  {e.description}
                  {e.originalCurrency && e.originalCurrency !== base && (
                    <small className="source-amount">
                      Original: {money(e.originalAmount, e.originalCurrency)} ·
                      1 {e.originalCurrency} = {e.rate} {base} on {e.rateDate}
                    </small>
                  )}
                </td>
                <td>
                  {e.category}
                  <small className="source-amount">
                    Paid by {member(e.paidBy)}
                  </small>
                </td>
                <td>{conversion.format(e.amount)}</td>
                <td>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(e.id);
                      setForm({
                        date: e.date,
                        description: e.description,
                        category: e.category,
                        amount: e.originalAmount ?? e.amount,
                        currency: e.originalCurrency || base,
                        paidBy: e.paidBy,
                        splitBetween: e.shares.map((s) => s.userId),
                      });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(() => removeExpense(id, e.id), "Expense removed.")
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card feature-card">
        <h2>{editing ? "Edit expense" : "Add an expense"}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const b = expenseSchema.parse(form);
              if (editing) await editExpense(id, editing, b);
              else await addExpense(id, b);
              setForm(initial());
              setEditing(null);
            }, "Expense saved and splits updated.");
          }}
        >
          <fieldset disabled={busy}>
            <div className="field-row">
              <label className="field">
                Date
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </label>
              <label className="field">
                Description
                <input
                  required
                  maxLength={200}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Amount paid in selected currency
                <input
                  required
                  type="number"
                  min={form.currency === "JPY" ? 1 : 0.01}
                  max={1e9}
                  step={form.currency === "JPY" ? 1 : 0.01}
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </label>
            </div>
            <CurrencyPicker
              label="Currency actually paid"
              value={form.currency}
              onChange={(currency) => setForm((f) => ({ ...f, currency }))}
            />
            <p className="meta">
              Changing this input’s currency identifies what you paid. It
              converts to {base} when saved, using the expense date’s available
              reference rate; future dates use the latest rate.
            </p>
            <label className="field">
              Paid by
              <select
                value={form.paidBy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidBy: e.target.value }))
                }
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="split-choices">
              <span>Split equally between</span>
              {trip.members.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={form.splitBetween.includes(m.id)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        splitBetween: e.target.checked
                          ? [...f.splitBetween, m.id]
                          : f.splitBetween.filter((i) => i !== m.id),
                      }))
                    }
                  />
                  {m.name}
                </label>
              ))}
            </div>
            <button className="btn btn-primary">
              {busy ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(initial());
                }}
              >
                Cancel edit
              </button>
            )}
          </fieldset>
        </form>
      </section>
      <section className="card feature-card">
        <h2>Who owes whom?</h2>
        <p>
          Suggested transfers to balance recorded expenses. These are
          calculations; no payments are processed.
        </p>
        {trip.settlements.length ? (
          trip.settlements.map((s, i) => (
            <p key={i}>
              <strong>{member(s.from)}</strong> owes{" "}
              <strong>{member(s.to)}</strong> {conversion.format(s.amount)}
            </p>
          ))
        ) : (
          <p>Everyone is balanced.</p>
        )}
      </section>
    </main>
  );
}
