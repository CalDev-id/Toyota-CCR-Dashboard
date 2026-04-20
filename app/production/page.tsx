"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ProductionItem = {
  id: number;
  name: string;
  quantity: number;
  date: string;
};

type ProductionForm = {
  name: string;
  quantity: string;
  date: string;
};

const initialForm: ProductionForm = {
  name: "",
  quantity: "",
  date: "",
};

function formatInputDate(value: string) {
  return value.slice(0, 10);
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState<Record<number, ProductionForm>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  async function loadItems() {
    setIsLoading(true);
    setError(null);

    try {
      const body = await readResponse(await fetch("/api/production"));
      setItems(body.data);
      setEditing(
        Object.fromEntries(
          body.data.map((item: ProductionItem) => [
            item.id,
            {
              name: item.name,
              quantity: String(item.quantity),
              date: formatInputDate(item.date),
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load production data",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    fetch("/api/production")
      .then(readResponse)
      .then((body) => {
        if (!isActive) {
          return;
        }

        setItems(body.data);
        setEditing(
          Object.fromEntries(
            body.data.map((item: ProductionItem) => [
              item.id,
              {
                name: item.name,
                quantity: String(item.quantity),
                date: formatInputDate(item.date),
              },
            ]),
          ),
        );
      })
      .catch((loadError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load production data",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await readResponse(
        await fetch("/api/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            quantity: Number(form.quantity),
            date: form.date,
          }),
        }),
      );
      setForm(initialForm);
      await loadItems();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create production data",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateItem(id: number) {
    const item = editing[id];

    if (!item) {
      return;
    }

    setError(null);

    try {
      await readResponse(
        await fetch(`/api/production/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            quantity: Number(item.quantity),
            date: item.date,
          }),
        }),
      );
      await loadItems();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update production data",
      );
    }
  }

  async function deleteItem(id: number) {
    setError(null);

    try {
      await readResponse(
        await fetch(`/api/production/${id}`, {
          method: "DELETE",
        }),
      );
      await loadItems();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete production data",
      );
    }
  }

  function setEditingValue(id: number, key: keyof ProductionForm, value: string) {
    setEditing((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  }

  return (
    <DefaultLayout>
      {error ? (
        <section className="mb-6 rounded-2xl border border-[#fecdca] bg-[#fef3f2] p-5 text-sm text-[#b42318]">
          <h2 className="font-semibold text-[#912018]">API request failed</h2>
          <p className="mt-1">
            Check <code className="font-semibold">DATABASE_URL</code>, make sure
            MySQL is running, then run{" "}
            <code className="font-semibold">npm run prisma:push</code>.
          </p>
          <p className="mt-2 break-words text-xs text-[#d92d20]">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.65fr_1.35fr]">
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101828]">
            Add Production Data
          </h2>
          <p className="mt-1 text-sm text-[#667085]">
            API CRUD data with name, quantity, and date
          </p>

          <form onSubmit={createItem} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[#344054]">
              Name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                placeholder="Body Parts"
              />
            </label>

            <label className="block text-sm font-medium text-[#344054]">
              Quantity
              <input
                required
                min="0"
                type="number"
                value={form.quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                className="mt-1 h-11 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                placeholder="120"
              />
            </label>

            <label className="block text-sm font-medium text-[#344054]">
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-lg border border-[#e4e7ec] px-3 text-sm outline-none focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
              />
            </label>

            <button
              className="h-11 w-full rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3648d9] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Data"}
            </button>
          </form>
        </article>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#667085]">Total Records</p>
            <p className="mt-3 text-3xl font-semibold text-[#101828]">
              {items.length}
            </p>
          </article>
          <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#667085]">Total Quantity</p>
            <p className="mt-3 text-3xl font-semibold text-[#101828]">
              {totalQuantity.toLocaleString()}
            </p>
          </article>
        </section>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
        <div className="border-b border-[#e4e7ec] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#101828]">
            Production API CRUD
          </h2>
          <p className="mt-1 text-sm text-[#667085]">
            Data is loaded and mutated through REST endpoints
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7ec]">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[#667085]" colSpan={4}>
                    Loading production data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[#667085]" colSpan={4}>
                    No production data yet. Add the first record.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4">
                      <input
                        required
                        value={editing[item.id]?.name ?? ""}
                        onChange={(event) =>
                          setEditingValue(item.id, "name", event.target.value)
                        }
                        className="h-10 w-56 rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-[#101828] outline-none focus:border-[#465fff]"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        required
                        min="0"
                        type="number"
                        value={editing[item.id]?.quantity ?? ""}
                        onChange={(event) =>
                          setEditingValue(
                            item.id,
                            "quantity",
                            event.target.value,
                          )
                        }
                        className="h-10 w-32 rounded-lg border border-[#e4e7ec] px-3 text-sm text-[#344054] outline-none focus:border-[#465fff]"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        required
                        type="date"
                        value={editing[item.id]?.date ?? ""}
                        onChange={(event) =>
                          setEditingValue(item.id, "date", event.target.value)
                        }
                        className="h-10 w-40 rounded-lg border border-[#e4e7ec] px-3 text-sm text-[#344054] outline-none focus:border-[#465fff]"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="h-10 rounded-lg bg-[#465fff] px-3 text-sm font-semibold text-white transition hover:bg-[#3648d9]"
                          type="button"
                          onClick={() => updateItem(item.id)}
                        >
                          Update
                        </button>
                        <button
                          className="h-10 rounded-lg border border-[#fecdca] px-3 text-sm font-semibold text-[#d92d20] transition hover:bg-[#fef3f2]"
                          type="button"
                          onClick={() => deleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DefaultLayout>
  );
}
