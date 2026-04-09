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

type MailTemplate = {
  id: string;
  title: string;
  body: string;
};

type ProgressState = {
  checked: string[];
  insurance: InsuranceRoute;
  handClaimant: HandClaimant;
  nicu: boolean;
  memo: string;
};

const STORAGE_KEY = "birth-report-progress-v1";

const mailTemplates: MailTemplate[] = [
  {
    id: "jks-general-affairs",
    title: "総務宛: 出産後の提出物送付",
    body: `件名: 出産後提出書類の送付（鈴木友也）

日本ナレッジスペース株式会社
総務部 田村様

お疲れ様です。鈴木です。
出産後の提出書類をお送りします。

本メールの添付:
- 母子手帳コピーその2（出生届出済証明ページ）
- 通帳コピーまたはキャッシュカード画像
- ikukyu_douisho（記入済みPDF）
- 出生後休業支援給付の確認書類

補足:
- 子どもの氏名（カナ）: 〔ここに記入〕
- 妻の扶養に入れる予定です

不足や追加で必要な書類がありましたらご教示ください。
よろしくお願いいたします。

鈴木 友也`
  },
  {
    id: "jks-child-kana",
    title: "総務宛: 子どもの氏名カナ連絡",
    body: `件名: 子どもの氏名（カナ）のご連絡（鈴木友也）

日本ナレッジスペース株式会社
総務部 田村様

お疲れ様です。鈴木です。
子どもの氏名（カナ）をご連絡いたします。

長子:
- 氏名: 〔ここに記入〕
- カナ: 〔ここに記入〕

第二子:
- 氏名: 〔ここに記入〕
- カナ: 〔ここに記入〕

被扶養者については妻の扶養に入れる予定です。
よろしくお願いいたします。

鈴木 友也`
  },
  {
    id: "jks-gojokai",
    title: "互助会宛: 出産祝い金連絡",
    body: `件名: 出産祝い金のご連絡（鈴木友也）

互助会 ご担当者様

お疲れ様です。鈴木友也です。
子どもが出生しましたので、出産祝い金についてご連絡いたします。

出生日:
- 〔ここに記入〕

子どもの情報:
- 長子: 〔ここに記入〕
- 第二子: 〔ここに記入〕

必要な追加情報や提出物がありましたらご案内ください。
よろしくお願いいたします。`
  }
];

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
    id: "company-jks",
    title: "会社向けの提出と連絡",
    subtitle:
      "日本ナレッジスペース株式会社の案内メールに基づく、出産後に速やかに出すものです。",
    tasks: [
      {
        id: "jks-check-prebirth",
        title: "出産前に出した書類が受理済みかだけ確認する",
        detail:
          "育児休業申出書、配偶者状況番号6、時短勤務希望の連絡はメール上は対応済みに見えるので、差し戻しがないかだけ確認する。"
      },
      {
        id: "jks-send-boshi-yotei",
        title: "母子手帳の予定日ページPDFを総務へ送る",
        detail:
          "育休開始日の確認用。『母子手帳コピーその1』として、分娩予定日の記載ページをPDFでメール提出する。"
      },
      {
        id: "jks-send-boshi-born",
        title: "母子手帳の出生届出済証明ページPDFを総務へ送る",
        detail:
          "育児休業給付金関連の提出物。出生届出済証明のページを、出産後速やかにPDFで送る。"
      },
      {
        id: "jks-send-bank-pdf",
        title: "通帳かキャッシュカードのPDFを総務へ送る",
        detail:
          "育児休業給付金関連の提出物。名義が分かる見開きページか、キャッシュカード画像をPDFで送る。"
      },
      {
        id: "jks-send-ikukyu-douisho",
        title: "ikukyu_douisho に記入してPDFで総務へ送る",
        detail:
          "2か所チェック、雇用保険の被保険者番号、署名捺印を入れてPDF提出する。原本郵送は不要。"
      },
      {
        id: "jks-send-spouse-proof",
        title: "出生後休業支援給付の配偶者確認書類をまとめて送る",
        detail:
          "メール上では配偶者状況『6』で回答済み。出産後は母子健康手帳の出生届出済証明ページなど、該当確認書類を育休給付金書類と一緒に出す。"
      },
      {
        id: "jks-send-child-kana-if-needed",
        title: "必要なら子どもの氏名カナを総務へ返信する",
        detail:
          "案内メールでは『子を被扶養者にしない場合は氏名カナを返信』となっている。今回の前提は妻の扶養なので、出生後に双子それぞれの氏名カナを送る。"
      },
      {
        id: "jks-notify-gojokai",
        title: "互助会へ出産祝い金の連絡をする",
        detail:
          "子どもが生まれたら、互助会宛 `gojyo@jpn-ks.co.jp` に出産祝い金の連絡を入れる。"
      }
    ]
  },
  {
    id: "pdf-prep",
    title: "事前にPDF化しておく書類",
    subtitle:
      "会社提出と電子申請の添付で使い回せるよう、先にファイル化しておくと楽です。",
    tasks: [
      {
        id: "pdf-boshi-yotei",
        title: "母子手帳の予定日ページをPDF化する",
        detail:
          "総務提出用。分娩予定日の記載ページを撮影して、1ファイルにまとめる。"
      },
      {
        id: "pdf-bank",
        title: "通帳またはキャッシュカードをPDF化する",
        detail:
          "総務提出用。名義が分かるページを撮影し、送付しやすいPDFにまとめる。"
      },
      {
        id: "pdf-ikukyu-douisho",
        title: "ikukyu_douisho を記入後にPDF化する",
        detail:
          "2か所チェック、雇用保険被保険者番号、署名捺印を入れてPDF保存する。原本郵送は不要。"
      },
      {
        id: "pdf-folder",
        title: "提出用PDFを1フォルダにまとめる",
        detail:
          "例: `JKS提出用`。ファイル名も `01_母子手帳予定日.pdf` のようにそろえる。"
      },
      {
        id: "pdf-boshi-born-later",
        title: "出産後に出生届出済証明ページを追加でPDF化する",
        detail:
          "出生後に必要になる母子手帳コピーその2。事前には未作成なので、出産後すぐ追加する。"
      },
      {
        id: "pdf-spouse-proof-later",
        title: "出産後に配偶者確認書類候補をPDF化する",
        detail:
          "出生後休業支援給付用。母子手帳の出生届出済証明ページなど、総務へ出す確認書類をまとめる。"
      }
    ]
  },
  {
    id: "jitan-guide",
    title: "育児時短同意書の書き方",
    subtitle:
      "docs/ikukyu_jitan_douisyo_printable.pdf を使うと、何を書くか迷いにくいです。",
    tasks: [
      {
        id: "jitan-open-pdf",
        title: "印刷用PDFを開く",
        detail:
          "事前に作成した `docs/ikukyu_jitan_douisyo_printable.pdf` を開いて、記入欄を確認する。"
      },
      {
        id: "jitan-check-two-boxes",
        title: "チェック欄2か所にチェックを入れる",
        detail:
          "会社案内どおり、受給資格確認と支給申請の両方にチェックを入れる。"
      },
      {
        id: "jitan-fill-number",
        title: "被保険者番号を記入する",
        detail:
          "雇用保険の被保険者番号を `4桁-6桁-1桁` の形式で記入する。"
      },
      {
        id: "jitan-fill-name",
        title: "被保険者氏名を直筆で記入し、必要なら捺印する",
        detail:
          "会社案内では署名捺印となっているので、直筆で氏名を書き、運用に合わせて押印する。"
      },
      {
        id: "jitan-confirm-company",
        title: "事業所名称を確認する",
        detail:
          "印刷用PDFには `日本ナレッジスペース株式会社` を入れてあるが、提出前に表記ゆれがないかだけ見直す。"
      },
      {
        id: "jitan-scan-pdf",
        title: "記入後に再度PDF化する",
        detail:
          "スマホスキャンでPDFにし、総務提出用フォルダへ保存する。原本郵送は不要。"
      },
      {
        id: "jitan-attach-mail",
        title: "総務宛メールに添付する",
        detail:
          "メールテンプレの『総務宛: 出産後の提出物送付』に添付して、そのまま送れる状態にする。"
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
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");

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
          }).sort((a, b) => {
            const aChecked = state.checked.includes(a.id);
            const bChecked = state.checked.includes(b.id);

            if (aChecked === bChecked) return 0;
            return aChecked ? 1 : -1;
          })
        }))
        .filter((section) => section.tasks.length > 0),
    [state.checked, state.insurance, state.nicu]
  );

  useEffect(() => {
    if (visibleSections.length === 0) {
      setActiveSectionId("");
      return;
    }

    if (!visibleSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, visibleSections]);

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

  const activeSection =
    visibleSections.find((section) => section.id === activeSectionId) ?? null;
  const activeTaskIds = activeSection?.tasks.map((task) => task.id) ?? [];
  const activeCompletedCount = activeTaskIds.filter((id) =>
    state.checked.includes(id)
  ).length;
  const activeProgress =
    activeTaskIds.length === 0
      ? 0
      : Math.round((activeCompletedCount / activeTaskIds.length) * 100);

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

  const copyTemplate = async (template: MailTemplate) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(template.body);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = template.body;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedTemplateId(template.id);
      window.setTimeout(() => {
        setCopiedTemplateId((current) =>
          current === template.id ? null : current
        );
      }, 1800);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = template.body;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedTemplateId(template.id);
      } catch {
        setCopiedTemplateId(null);
      }
    }
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

      <section className="task-section">
        <div className="section-head">
          <h2>メールテンプレ</h2>
          <p>社内連絡でそのまま使える叩き台です。コピーして必要箇所だけ埋めて使えます。</p>
        </div>
        <div className="template-list">
          {mailTemplates.map((template) => (
            <article className="template-card" key={template.id}>
              <div className="template-head">
                <h3>{template.title}</h3>
                <button
                  className="copy-button"
                  type="button"
                  onClick={() => copyTemplate(template)}
                >
                  {copiedTemplateId === template.id ? "コピー済み" : "本文をコピー"}
                </button>
              </div>
              <pre className="template-body">{template.body}</pre>
            </article>
          ))}
        </div>
      </section>

      {visibleSections.length > 0 ? (
        <section className="task-section">
          <div className="section-head">
            <h2>Task Sections</h2>
            <p>Switch between sections and track progress for each one.</p>
          </div>

          <div className="tab-list" role="tablist" aria-label="Task section tabs">
            {visibleSections.map((section) => {
              const sectionTaskIds = section.tasks.map((task) => task.id);
              const sectionCompletedCount = sectionTaskIds.filter((id) =>
                state.checked.includes(id)
              ).length;
              const sectionProgress =
                sectionTaskIds.length === 0
                  ? 0
                  : Math.round(
                      (sectionCompletedCount / sectionTaskIds.length) * 100
                    );
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  className={`tab-button ${isActive ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${section.id}`}
                  id={`tab-${section.id}`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <span className="tab-title">{section.title}</span>
                  <span className="tab-meta">
                    {sectionCompletedCount}/{sectionTaskIds.length} done | {sectionProgress}%
                  </span>
                </button>
              );
            })}
          </div>

          {activeSection ? (
            <div
              className="tab-panel"
              role="tabpanel"
              id={`panel-${activeSection.id}`}
              aria-labelledby={`tab-${activeSection.id}`}
            >
              <div className="tab-panel-head">
                <div className="section-head">
                  <h2>{activeSection.title}</h2>
                  <p>{activeSection.subtitle}</p>
                </div>

                <div className="tab-progress-card">
                  <div className="tab-progress-row">
                    <strong>{activeProgress}%</strong>
                    <span>
                      {activeCompletedCount}/{activeTaskIds.length} done
                    </span>
                  </div>
                  <div
                    className="progress-bar section-progress-bar"
                    aria-label={`${activeSection.title} progress ${activeProgress}%`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={activeProgress}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${activeProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="task-list">
                {activeSection.tasks.map((task) => {
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
                                {task.linkLabel ?? "Open related page"}
                              </a>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default App;
