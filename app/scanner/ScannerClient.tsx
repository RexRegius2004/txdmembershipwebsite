"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  member_number: string;
  full_name: string;
  email: string | null;
  qr_token: string;
  status: string;
};

type Season = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
};

type PointRule = {
  id: string;
  name: string;
  description: string | null;
  points: number;
};

type PointTransaction = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  point_rule_id: string;
};

type ScannerData = {
  member: Member;
  season: Season;
  pointRules: PointRule[];
  points: number;
};

export default function ScannerClient() {
  const supabase = createClient();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);

  /*
   * Keeps track of the previous scanner cleanup.
   *
   * This prevents React Strict Mode or a fast
   * remount from creating two camera instances.
   */
  const cleanupPromiseRef =
    useRef<Promise<void> | null>(null);

  const [result, setResult] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointTransaction[]>([]);

  const [lookingUp, setLookingUp] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /*
   * Start QR scanner.
   */
    useEffect(() => {
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    mountedRef.current = true;

    async function startScanner() {
      /*
       * Give React time to finish mounting the scanner DOM.
       *
       * This also prevents React development-mode remounts
       * from starting the camera twice during the initial render.
       */
      await new Promise<void>((resolve) => {
        startTimer = setTimeout(resolve, 100);
      });

      if (cancelled || !mountedRef.current) {
        return;
      }

      /*
       * Never create another scanner if one already exists.
       */
      if (scannerRef.current) {
        return;
      }

      const element = document.getElementById("qr-reader");

      if (!element) {
        if (!cancelled && mountedRef.current) {
          setError("Unable to initialize the QR scanner.");
        }
        return;
      }

      /*
       * Make sure the container is empty before html5-qrcode
       * creates its video/camera elements.
       */
      element.replaceChildren();

      const scanner = new Html5Qrcode("qr-reader");

      scannerRef.current = scanner;
      startingRef.current = true;

      try {
        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          (decodedText) => {
            if (cancelled || !mountedRef.current) {
              return;
            }

            /*
             * Prevent multiple scans while the member lookup
             * is being processed.
             */
            if (processingRef.current) {
              return;
            }

            processingRef.current = true;

            setResult(decodedText);
            setError(null);
            setSuccess(null);
            setLookingUp(true);

            getScannerData(decodedText)
              .then(async (data) => {
                if (cancelled || !mountedRef.current) {
                  return;
                }

                setMember(data.member);
                setSeason(data.season);
                setPointRules(data.pointRules);
                setPoints(data.points);

                setLoadingHistory(true);

                try {
                  const transactions =
                    await getMemberHistory(
                      data.member.id,
                      data.season.id
                    );

                  if (
                    cancelled ||
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setHistory(transactions);
                } catch (historyError) {
                  console.error(
                    "Failed to load point history:",
                    historyError
                  );

                  if (
                    !cancelled &&
                    mountedRef.current
                  ) {
                    setHistory([]);
                  }
                } finally {
                  if (
                    !cancelled &&
                    mountedRef.current
                  ) {
                    setLoadingHistory(false);
                  }
                }
              })
              .catch((err) => {
                console.error(
                  "Scanner lookup failed:",
                  err
                );

                if (
                  cancelled ||
                  !mountedRef.current
                ) {
                  return;
                }

                setMember(null);
                setSeason(null);
                setPointRules([]);
                setPoints(0);
                setHistory([]);

                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to load member."
                );
              })
              .finally(() => {
                if (
                  !cancelled &&
                  mountedRef.current
                ) {
                  setLookingUp(false);
                }

                processingRef.current = false;
              });
          },
          () => {
            /*
             * Individual QR decode failures are expected.
             * Do not display them to the user.
             */
          }
        );

        /*
         * The component could have been unmounted while
         * html5-qrcode was starting the camera.
         *
         * If that happened, stop the scanner now that
         * startup has finished.
         */
        if (cancelled || !mountedRef.current) {
          try {
            await scanner.stop();
          } catch {
            // Scanner may already have stopped.
          }

          try {
            scanner.clear();
          } catch {
            // DOM may already have been cleared.
          }

          if (scannerRef.current === scanner) {
            scannerRef.current = null;
          }

          return;
        }
      } catch (err) {
        /*
         * Browsers can throw AbortError when camera/video
         * playback is interrupted during mounting/unmounting.
         *
         * This is not a real camera permission failure.
         */
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        if (cancelled || !mountedRef.current) {
          return;
        }

        console.error(
          "Failed to start QR scanner:",
          err
        );

        setError(
          "Unable to access the camera. Please allow camera permissions."
        );
      } finally {
        startingRef.current = false;
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      processingRef.current = false;

      if (startTimer !== null) {
        clearTimeout(startTimer);
        startTimer = null;
      }

      const scanner = scannerRef.current;

      if (!scanner) {
        return;
      }

      /*
       * Remove our reference immediately so a new mount
       * cannot accidentally reuse this scanner instance.
       */
      scannerRef.current = null;

      /*
       * If the scanner has already finished starting,
       * stop it normally.
       *
       * If it is still starting, startScanner() will detect
       * `cancelled` after start() resolves and clean it up.
       */
      if (!startingRef.current) {
        void (async () => {
          try {
            await scanner.stop();
          } catch {
            // Scanner may already be stopped.
          }

          try {
            scanner.clear();
          } catch {
            // DOM may already have been cleared.
          }
        })();
      }
    };
  }, []);

  /*
   * Look up member information using the secure
   * scanner RPC.
   */
  async function getScannerData(
    qrToken: string
  ): Promise<ScannerData> {
    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      "get_scanner_data",
      {
        p_qr_token: qrToken,
      }
    );

    if (rpcError) {
      throw new Error(
        rpcError.message
      );
    }

    if (!data) {
      throw new Error(
        "Member information could not be found."
      );
    }

    return data as ScannerData;
  }

  /*
   * Load the member's point history.
   */
  async function getMemberHistory(
    memberId: string,
    seasonId: string
  ): Promise<PointTransaction[]> {
    const {
      data,
      error: historyError,
    } = await supabase
      .from("point_transactions")
      .select(
        "id, amount, reason, created_at, point_rule_id"
      )
      .eq("member_id", memberId)
      .eq("season_id", seasonId)
      .order("created_at", {
        ascending: false,
      });

    if (historyError) {
      throw new Error(
        historyError.message
      );
    }

    return (data ?? []) as PointTransaction[];
  }

  /*
   * Add points through the secure RPC.
   *
   * The frontend sends only the point-rule ID.
   * The database determines the actual point value.
   */
  async function handleAddPoints(
    pointRuleId: string
  ) {
    if (
      !member ||
      !season ||
      addingPoints
    ) {
      return;
    }

    setAddingPoints(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "add_points",
        {
          p_member_id: member.id,
          p_season_id: season.id,
          p_point_rule_id: pointRuleId,
        }
      );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      if (!data) {
        throw new Error(
          "The point transaction could not be created."
        );
      }

      const transaction =
        data as PointTransaction;

      /*
       * Update displayed points.
       */
      setPoints(
        (current) =>
          current + transaction.amount
      );

      /*
       * Add the transaction to history
       * immediately instead of requiring
       * another scan.
       */
      setHistory((current) => [
        transaction,
        ...current,
      ]);

      setSuccess(
        `Added ${transaction.amount} points to ${member.full_name}.`
      );
    } catch (err) {
      console.error(
        "Failed to add points:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add points."
      );
    } finally {
      setAddingPoints(false);
    }
  }

  /*
   * Reset the scanner UI so another member
   * can be scanned.
   *
   * The actual camera stays running.
   */
  function resetScanner() {
    processingRef.current = false;

    setResult("");
    setMember(null);
    setSeason(null);
    setPointRules([]);
    setPoints(0);
    setHistory([]);

    setLookingUp(false);
    setLoadingHistory(false);
    setAddingPoints(false);

    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-6">
      {/* Scanner */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">
            Scan Membership Card
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Point the camera at the member's QR code.
          </p>
        </div>

        <div
          id="qr-reader"
          className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-black"
        />

        {lookingUp && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-sm text-zinc-400">
            Looking up member...
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}
      </section>

      {/* Member information */}
      {member && season && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Member
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {member.full_name}
                </h2>

                <p className="mt-1 font-mono text-sm text-zinc-400">
                  {member.member_number}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Current Points
                </p>

                <p className="mt-1 text-3xl font-black text-white">
                  {points}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Season
                </p>

                <p className="mt-1 font-semibold text-white">
                  {season.name}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Status
                </p>

                <p className="mt-1 font-semibold capitalize text-white">
                  {member.status}
                </p>
              </div>
            </div>
          </div>

          {/* Point rules */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white">
                Add Points
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                Select a predefined point rule.
              </p>
            </div>

            {pointRules.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No active point rules are available.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pointRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() =>
                      handleAddPoints(rule.id)
                    }
                    disabled={addingPoints}
                    className="group rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">
                          {rule.name}
                        </p>

                        {rule.description && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {rule.description}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-black text-black">
                        +{rule.points}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Point history */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Point History
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Recent transactions for this season.
                </p>
              </div>

              <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                {history.length}{" "}
                {history.length === 1
                  ? "transaction"
                  : "transactions"}
              </span>
            </div>

            {loadingHistory ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No point transactions yet.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {transaction.reason}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(
                          transaction.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <span className="shrink-0 font-bold text-emerald-400">
                      +{transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetScanner}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Scan Another Member
            </button>
          </div>
        </section>
      )}

      {/* Scan state */}
      {!member && !lookingUp && !error && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
          <p className="text-sm text-zinc-500">
            Waiting for a membership QR code...
          </p>
        </div>
      )}
    </div>
  );
}