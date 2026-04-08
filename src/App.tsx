import { useEffect, useMemo, useState } from "react";

type InsuranceRoute = "workplace" | "national";
type HandClaimant = "father" | "mother";

type Task = {
  id: string;
  title: string;
  detail: string;
  linkLabel?: string;
  linkUrl?: string;
  onlyIf?: {
    insurance?: InsuranceRoute;
    nicu?: boolean;
  };
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  tasks: Task[];
};

type ProgressState = {
  checked: string[];
  insurance: InsuranceRoute;
  handClaimant: HandClaimant;
  nicu: boolean;
  memo: string;
};

const STORAGE_KEY = "birth-report-progress-v1";

const sections: Section[] = [
  {
    id: "decisions",
    title: "今夜の最重要決定",
    subtitle: "ここが未決定だと、明日の窓口と帰宅後の電子申請の両方で止まりやすいです。",
    tasks: [
      {
        id: "choose-claimant",
        title: "児童手当の請求者を決める",
        detail: "原則は父母のうち恒常的に所得が高い方。振込先口座もその人名義にそろえる。"
      },
      {
        id: "choose-insurance",
        title: "子どもの健康保険ルートを決める",
        detail: "勤務先の健康保険の扶養に入れるか、国民健康保険にするかを先に決める。"
      },
      {
        id: "confirm-two-forms",
        title: "出生届が双子分で2通あるか確認する",
        detail:
          "出生証明欄つきの届書が2人分そろっているか、病院からの受取物を見直す。"
      },
      {
        id: "decide-mynumber",
        title: "赤ちゃんのマイナンバーカード同時申請をするか決める",
        detail: "出生届と一緒に出すなら、同時申請対応の様式かを確認しておく。"
      }
    ]
  },
  {
    id: "documents",
    title: "書類と持ち物をそろえる",
    subtitle: "窓口提出用と、電子申請の添付用を同時に準備します。",
    tasks: [
      {
        id: "pack-birth-forms",
        title: "出生届2通をクリアファイルに入れる",
        detail: "折れや汚れ防止。記入漏れがないか見直す。"
      },
      {
        id: "pack-maternal-book",
        title: "母子健康手帳をバッグに入れる",
        detail: "出生連絡票や補助券の確認も一緒に済ませる。"
      },
      {
        id: "pack-id",
        title: "来庁する人の本人確認書類を入れる",
        detail: "運転免許証やマイナンバーカードなど。"
      },
      {
        id: "pack-seal",
        title: "印鑑を入れる",
        detail: "押印は任意でも、持っていると安心。"
      },
      {
        id: "pack-bank",
        title: "児童手当請求者名義の口座情報を用意する",
        detail: "通帳かキャッシュカードを写真保存して、現物もすぐ出せるようにする。"
      },
      {
        id: "pack-mynumber",
        title: "請求者と配偶者のマイナンバー確認資料を用意する",
        detail: "通知カード、個人番号付き住民票、マイナンバーカードなど。"
      },
      {
        id: "copy-docs",
        title: "重要書類をスマホで撮影しておく",
        detail:
          "本人確認書類、口座、保険証、出生届の控えに使えるページを保存する。電子申請の添付用にも使う。"
      },
      {
        id: "pack-kokuho",
        title: "親の国民健康保険証を入れる",
        detail: "親が国保加入なら必要。",
        onlyIf: { insurance: "national" }
      },
      {
        id: "pack-work-insurance",
        title: "妻の健康保険資格情報を確認する",
        detail:
          "妻の勤務先健保の名称や記号番号をすぐ出せるようにしておく。医療証申請の後追い準備にもなる。",
        onlyIf: { insurance: "workplace" }
      }
    ]
  },
  {
    id: "digital-prep",
    title: "電子申請の事前準備",
    subtitle: "帰宅後にスマホだけで進めやすいよう、前夜に情報を固めます。",
    tasks: [
      {
        id: "write-kana",
        title: "双子それぞれの氏名とふりがなを最終確認する",
        detail: "戸籍に載る表記そのままで統一する。"
      },
      {
        id: "write-honseki",
        title: "本籍地と筆頭者をメモしておく",
        detail: "出生届記入で詰まりやすいので、すぐ見られるようにする。"
      },
      {
        id: "write-birth-contact",
        title: "出生連絡票の書ける欄を先に埋める",
        detail: "明日は投函だけにする。"
      },
      {
        id: "prepare-online-upload",
        title: "電子申請で添付しそうな画像を1つのアルバムにまとめる",
        detail:
          "本人確認書類、口座、保険資格情報、必要ならマイナンバー資料を1つにまとめる。"
      },
      {
        id: "bookmark-links",
        title: "電子申請ページをスマホのタブで開いておく",
        detail:
          "児童手当、子ども医療証、必要なら国保のページをブックマークしておくと、帰宅後すぐ進めやすい。"
      },
      {
        id: "make-window-note",
        title: "明日の窓口で伝える要点メモを作る",
        detail:
          "『出生届だけ提出したい。児童手当などは電子申請で進めたいので、今日確認が必要なことだけ知りたい』と伝える。"
      }
    ]
  },
  {
    id: "tomorrow",
    title: "明日市役所でやること",
    subtitle: "窓口は出生届に絞り、その場でしか確認できないことだけ聞きます。",
    tasks: [
      {
        id: "submit-birth",
        title: "市民課で出生届2通を提出する",
        detail: "同日に電子申請へ切り替えたいことを最初に伝える。"
      },
      {
        id: "submit-mynumber",
        title: "必要なら赤ちゃんのマイナンバーカード同時申請をする",
        detail: "出生届と一緒に処理できるか、その場で確認する。"
      },
      {
        id: "confirm-child-hand-online",
        title: "児童手当を電子申請で出す前提で、請求区分だけ最終確認する",
        detail:
          "第1子出生として新規認定請求になるか、上の子がいて額改定になるかを自分の状況に照らして確認する。"
      },
      {
        id: "confirm-iryosho",
        title: "子ども医療証を電子申請で出す前提で必要書類だけ確認する",
        detail:
          "子どもの保険資格情報がまだない場合は、何がそろった時点で申請できるかを確認する。"
      },
      {
        id: "ask-digital-route",
        title: "当日完了しない手続きの電子申請ルートを確認する",
        detail: "医療証、国保、追加提出書類の出し方をその場で確認する。"
      }
    ]
  },
  {
    id: "online-after",
    title: "帰宅後にスマホで電子申請すること",
    subtitle: "出生届の受理後に、窓口へ戻らず進める前提の動線です。",
    tasks: [
      {
        id: "apply-child-hand-online",
        title: "児童手当を電子申請する",
        detail:
          "ぴったりサービスから進める。第1子出生なら新規認定請求、すでに受給中なら額改定請求を選ぶ。",
        linkLabel: "大和市 児童手当電子申請案内",
        linkUrl:
          "https://www.city.yamato.lg.jp/gyosei/soshik/7/sonohokanojoho/kosodate/kosodatesupport/6385.html"
      },
      {
        id: "apply-kokuho-online",
        title: "国保加入をオンライン申請する",
        detail:
          "子どもを国保に入れる場合のみ。出生届完了後に、ぴったりサービスから申請する。",
        linkLabel: "大和市 国保オンライン手続き",
        linkUrl: "https://www.city.yamato.lg.jp/gyosei/soshik/2020/21347.html",
        onlyIf: { insurance: "national" }
      },
      {
        id: "apply-iryosho-online",
        title: "子ども医療証の交付申請を電子申請する",
        detail:
          "子どもの保険資格情報が確認できる資料がそろったら、そのまま電子申請で送る。",
        linkLabel: "大和市 子ども医療証",
        linkUrl: "https://www.city.yamato.lg.jp/section/ehon_no_machi/age/C/C00006.html"
      },
      {
        id: "post-birth-contact",
        title: "出生連絡票を投函する",
        detail: "できればその日のうちに出す。"
      },
      {
        id: "notify-work",
        title: "勤務先へ出生報告と育休手続きの連絡を入れる",
        detail: "夫婦それぞれの申出期限に間に合うよう、人事総務へ送る。"
      },
      {
        id: "request-dependent",
        title: "妻の勤務先健康保険で扶養追加申請を始める",
        detail:
          "妻の会社様式や必要添付を確認し、子どもの資格情報が早く出るよう回し始める。",
        onlyIf: { insurance: "workplace" }
      },
      {
        id: "track-iryosho",
        title: "医療証の不足書類があれば提出予定日を決める",
        detail: "保険資格情報がまだないなら、出る見込み日をメモして再申請漏れを防ぐ。"
      }
    ]
  },
  {
    id: "nicu",
    title: "NICU・未熟児養育医療の確認",
    subtitle: "該当しないなら非表示にできます。",
    tasks: [
      {
        id: "confirm-eligible",
        title: "病院に未熟児養育医療の対象か確認する",
        detail: "低出生体重や指定医療機関入院なら対象になる可能性がある。",
        onlyIf: { nicu: true }
      },
      {
        id: "collect-opinion",
        title: "病院側の意見書など院内で出る書類を確認する",
        detail: "医療ソーシャルワーカーに窓口を聞く。",
        onlyIf: { nicu: true }
      },
      {
        id: "avoid-prepay",
        title: "養育医療券の案内が出る前に自己判断で精算しない",
        detail: "先払い後の払い戻し不可になり得るので、病院と市の案内を待つ。",
        onlyIf: { nicu: true }
      }
    ]
  }
];

const defaultState: ProgressState = {
  checked: [],
  insurance: "workplace",
  handClaimant: "mother",
  nicu: false,
  memo: ""
};

function loadState(): ProgressState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      checked: Array.isArray(parsed.checked) ? parsed.checked : defaultState.checked,
      insurance:
        parsed.insurance === "national" ? "national" : defaultState.insurance,
      handClaimant:
        parsed.handClaimant === "mother" ? "mother" : defaultState.handClaimant,
      nicu: Boolean(parsed.nicu),
      memo: typeof parsed.memo === "string" ? parsed.memo : defaultState.memo
    };
  } catch {
    return defaultState;
  }
}

function App() {
  const [state, setState] = useState<ProgressState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          tasks: section.tasks.filter((task) => {
            if (
              task.onlyIf?.insurance &&
              task.onlyIf.insurance !== state.insurance
            ) {
              return false;
            }
            if (
              typeof task.onlyIf?.nicu === "boolean" &&
              task.onlyIf.nicu !== state.nicu
            ) {
              return false;
            }
            return true;
          })
        }))
        .filter((section) => section.tasks.length > 0),
    [state.insurance, state.nicu]
  );

  const visibleTaskIds = visibleSections.flatMap((section) =>
    section.tasks.map((task) => task.id)
  );
  const completedCount = visibleTaskIds.filter((id) =>
    state.checked.includes(id)
  ).length;
  const progress =
    visibleTaskIds.length === 0
      ? 0
      : Math.round((completedCount / visibleTaskIds.length) * 100);

  const nextTask = visibleSections
    .flatMap((section) =>
      section.tasks.map((task) => ({ ...task, sectionTitle: section.title }))
    )
    .find((task) => !state.checked.includes(task.id));

  const toggleTask = (taskId: string) => {
    setState((current) => ({
      ...current,
      checked: current.checked.includes(taskId)
        ? current.checked.filter((id) => id !== taskId)
        : [...current.checked, taskId]
    }));
  };

  const clearAll = () => {
    setState(defaultState);
  };

  const claimantLabel = state.handClaimant === "father" ? "父" : "母";

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Yamato Birth Report PWA</p>
        <h1>大和市での出生後手続きを、明日一気に進めるためのTODO</h1>
        <p className="lead">
          双子前提で、前夜準備から市役所後の後追いまでを細かく分解しています。
          進捗はこの端末に保存されるので、途中で閉じても続きから再開できます。
        </p>
        <p className="strategy-note">
          この版では、出生届だけを窓口で進め、児童手当を含むそれ以外はできるだけ電子申請に寄せる前提で組んでいます。
        </p>

        <div className="status-grid">
          <div className="metric">
            <span className="metric-label">進捗</span>
            <strong>{progress}%</strong>
          </div>
          <div className="metric">
            <span className="metric-label">完了</span>
            <strong>
              {completedCount}/{visibleTaskIds.length}
            </strong>
          </div>
          <div className="metric accent">
            <span className="metric-label">児童手当の請求者</span>
            <strong>{claimantLabel}</strong>
          </div>
        </div>

        <div
          className="progress-bar"
          aria-label={`タスク進捗 ${progress}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="controls-card">
        <div className="control-block">
          <label htmlFor="insurance">子どもの健康保険ルート</label>
          <select
            id="insurance"
            value={state.insurance}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                insurance: event.target.value as InsuranceRoute
              }))
            }
          >
            <option value="workplace">勤務先の健康保険の扶養に入れる</option>
            <option value="national">国民健康保険に入れる</option>
          </select>
        </div>

        <div className="control-block">
          <label htmlFor="claimant">児童手当の請求者</label>
          <select
            id="claimant"
            value={state.handClaimant}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                handClaimant: event.target.value as HandClaimant
              }))
            }
          >
            <option value="father">父</option>
            <option value="mother">母</option>
          </select>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={state.nicu}
            onChange={(event) =>
              setState((current) => ({ ...current, nicu: event.target.checked }))
            }
          />
          <span>NICU・未熟児養育医療の確認タスクも表示する</span>
        </label>

        <button className="ghost-button" onClick={clearAll} type="button">
          進捗をリセット
        </button>
      </section>

      {nextTask ? (
        <section className="next-card">
          <p className="next-label">次にやること</p>
          <h2>{nextTask.title}</h2>
          <p className="next-meta">{nextTask.sectionTitle}</p>
          <p className="next-detail">{nextTask.detail}</p>
        </section>
      ) : (
        <section className="next-card completed-card">
          <p className="next-label">次にやること</p>
          <h2>見えているタスクはすべて完了です</h2>
          <p className="next-detail">
            明日の窓口や電子申請で追加書類が出たら、メモ欄に残して後追い分を管理してください。
          </p>
        </section>
      )}

      <section className="memo-card">
        <div className="section-head">
          <h2>メモ</h2>
          <p>窓口で言われたことや、あとで出す書類を書き残せます。</p>
        </div>
        <textarea
          value={state.memo}
          onChange={(event) =>
            setState((current) => ({ ...current, memo: event.target.value }))
          }
          placeholder="例：医療証は子の資格情報が出たら電子申請で出す、など"
        />
      </section>

      {visibleSections.map((section) => (
        <section className="task-section" key={section.id}>
          <div className="section-head">
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>

          <div className="task-list">
            {section.tasks.map((task) => {
              const checked = state.checked.includes(task.id);

              return (
                <label className={`task-card ${checked ? "done" : ""}`} key={task.id}>
                  <div className="task-top">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(task.id)}
                    />
                    <div>
                      <span className="task-title">{task.title}</span>
                      <p className="task-detail">{task.detail}</p>
                      {task.linkUrl ? (
                        <p className="task-link-row">
                          <a
                            className="task-link"
                            href={task.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {task.linkLabel ?? "関連ページを開く"}
                          </a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

export default App;
