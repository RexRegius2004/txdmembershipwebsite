"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getBattlePassSettings,
  createReward,
  updateReward,
  deleteReward,
  updateCoreRequirements,
} from "./actions";


type Season = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  core_selection_points: number;
  core_maintenance_points: number;
};


type Reward = {
  id: string;
  season_id: string;
  level: number;
  required_points: number;
  name: string;
  description: string | null;
};


export default function BattlePassAdminPage() {
  const [season, setSeason] =
    useState<Season | null>(null);

  const [rewards, setRewards] =
    useState<Reward[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);


  const [newLevel, setNewLevel] =
    useState("");

  const [newPoints, setNewPoints] =
    useState("");

  const [newName, setNewName] =
    useState("");

  const [newDescription, setNewDescription] =
    useState("");


  useEffect(() => {
    load();
  }, []);


  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data =
        await getBattlePassSettings();

      setSeason(data.activeSeason);
      setRewards(data.rewards);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Battle Pass settings."
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleAddReward(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!season) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await createReward(
        season.id,
        Number(newLevel),
        Number(newPoints),
        newName,
        newDescription
      );

      setNewLevel("");
      setNewPoints("");
      setNewName("");
      setNewDescription("");

      await load();

      setSuccess(
        "Battle Pass level created."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create level."
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleUpdateReward(
    reward: Reward
  ) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateReward(
        reward.id,
        reward.level,
        reward.required_points,
        reward.name,
        reward.description ?? ""
      );

      setSuccess(
        `Level ${reward.level} updated.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update level."
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleDeleteReward(
    rewardId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this Battle Pass level?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await deleteReward(
        rewardId
      );

      await load();

      setSuccess(
        "Battle Pass level deleted."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete level."
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleCoreRequirements() {
    if (!season) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateCoreRequirements(
        season.id,
        season.core_selection_points,
        season.core_maintenance_points
      );

      setSuccess(
        "Core membership requirements updated."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update Core requirements."
      );
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        <p className="text-zinc-500">
          Loading Battle Pass settings...
        </p>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-10">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            ADMINISTRATION
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Battle Pass
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Configure Battle Pass levels and Core
            membership requirements.
          </p>
        </div>


        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}


        {/* SUCCESS */}

        {success && (
          <div className="mt-6 rounded-xl border border-green-900 bg-green-950/30 p-4">
            <p className="text-sm text-green-400">
              ✓ {success}
            </p>
          </div>
        )}


        {!season ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="font-semibold">
              No active season
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Create and activate a season before
              configuring the Battle Pass.
            </p>
          </div>
        ) : (
          <>
            {/* SEASON */}

            <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

              <p className="text-xs uppercase tracking-widest text-zinc-600">
                ACTIVE SEASON
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {season.name}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {season.start_date}
                {" → "}
                {season.end_date}
              </p>

            </section>


            {/* CORE REQUIREMENTS */}

            <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

              <p className="text-xs uppercase tracking-widest text-zinc-600">
                CORE MEMBERSHIP
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Core Requirements
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                These values determine when members
                become eligible for Core review.
              </p>


              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="text-sm text-zinc-400">
                    Core Selection Points
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      season.core_selection_points
                    }
                    onChange={(event) =>
                      setSeason({
                        ...season,
                        core_selection_points:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-600"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Points required before a Standard
                    Member can enter Core review.
                  </p>

                </label>


                <label className="block">

                  <span className="text-sm text-zinc-400">
                    Core Maintenance Points
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      season.core_maintenance_points
                    }
                    onChange={(event) =>
                      setSeason({
                        ...season,
                        core_maintenance_points:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-600"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Points required during a Core
                    member maintenance period.
                  </p>

                </label>

              </div>


              <button
                type="button"
                disabled={saving}
                onClick={
                  handleCoreRequirements
                }
                className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                Save Core Requirements
              </button>

            </section>


            {/* BATTLE PASS */}

            <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  BATTLE PASS
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Levels & Rewards
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Change how many points are required
                  for each Battle Pass level.
                </p>
              </div>


              {/* LEVEL LIST */}

              <div className="mt-6 space-y-4">

                {rewards.length === 0 ? (

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm text-zinc-500">
                      No Battle Pass levels have
                      been created yet.
                    </p>
                  </div>

                ) : (

                  rewards.map((reward) => (

                    <div
                      key={reward.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                    >

                      <div className="grid gap-4 md:grid-cols-[100px_160px_1fr]">

                        <label>
                          <span className="text-xs text-zinc-600">
                            LEVEL
                          </span>

                          <input
                            type="number"
                            min="1"
                            value={
                              reward.level
                            }
                            onChange={(event) =>
                              setRewards(
                                rewards.map(
                                  (item) =>
                                    item.id ===
                                    reward.id
                                      ? {
                                          ...item,
                                          level:
                                            Number(
                                              event
                                                .target
                                                .value
                                            ),
                                        }
                                      : item
                                )
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none"
                          />
                        </label>


                        <label>
                          <span className="text-xs text-zinc-600">
                            REQUIRED POINTS
                          </span>

                          <input
                            type="number"
                            min="0"
                            value={
                              reward.required_points
                            }
                            onChange={(event) =>
                              setRewards(
                                rewards.map(
                                  (item) =>
                                    item.id ===
                                    reward.id
                                      ? {
                                          ...item,
                                          required_points:
                                            Number(
                                              event
                                                .target
                                                .value
                                            ),
                                        }
                                      : item
                                )
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none"
                          />
                        </label>


                        <label>
                          <span className="text-xs text-zinc-600">
                            REWARD NAME
                          </span>

                          <input
                            type="text"
                            value={
                              reward.name
                            }
                            onChange={(event) =>
                              setRewards(
                                rewards.map(
                                  (item) =>
                                    item.id ===
                                    reward.id
                                      ? {
                                          ...item,
                                          name:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none"
                          />
                        </label>

                      </div>


                      <label className="mt-4 block">

                        <span className="text-xs text-zinc-600">
                          DESCRIPTION
                        </span>

                        <textarea
                          value={
                            reward.description ??
                            ""
                          }
                          onChange={(event) =>
                            setRewards(
                              rewards.map(
                                (item) =>
                                  item.id ===
                                  reward.id
                                    ? {
                                        ...item,
                                        description:
                                          event
                                            .target
                                            .value,
                                      }
                                    : item
                              )
                            )
                          }
                          rows={2}
                          className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
                        />

                      </label>


                      <div className="mt-4 flex gap-2">

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            handleUpdateReward(
                              reward
                            )
                          }
                          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
                        >
                          Save
                        </button>


                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            handleDeleteReward(
                              reward.id
                            )
                          }
                          className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  ))

                )}

              </div>


              {/* ADD LEVEL */}

              <div className="mt-8 border-t border-zinc-800 pt-6">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  ADD LEVEL
                </p>

                <form
                  onSubmit={
                    handleAddReward
                  }
                  className="mt-4"
                >

                  <div className="grid gap-4 md:grid-cols-2">

                    <input
                      type="number"
                      min="1"
                      placeholder="Level"
                      value={newLevel}
                      onChange={(event) =>
                        setNewLevel(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none"
                      required
                    />


                    <input
                      type="number"
                      min="0"
                      placeholder="Required points"
                      value={newPoints}
                      onChange={(event) =>
                        setNewPoints(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none"
                      required
                    />


                    <input
                      type="text"
                      placeholder="Reward name"
                      value={newName}
                      onChange={(event) =>
                        setNewName(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none md:col-span-2"
                      required
                    />


                    <textarea
                      placeholder="Reward description"
                      value={newDescription}
                      onChange={(event) =>
                        setNewDescription(
                          event.target.value
                        )
                      }
                      rows={3}
                      className="resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none md:col-span-2"
                    />

                  </div>


                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-50"
                  >
                    Add Battle Pass Level
                  </button>

                </form>

              </div>

            </section>

          </>
        )}

      </div>

    </main>
  );
}