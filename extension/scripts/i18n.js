'use strict';

(() => {
  const STORAGE_KEY = 'marknestLocale';
  const FALLBACK = 'zh-CN';
  const SUPPORTED = ['zh-CN', 'en', 'ja', 'fr', 'de'];
  const dictionaries = {
    en: {
      '收藏夹整理首页':'MarkNest home','收藏夹整理':'Bookmark organizer','撤销上次操作':'Undo last action','撤销':'Undo','检查链接':'Check links','导入并比对':'Import & compare','重新扫描':'Rescan','从这里开始':'Start here','让收藏，\n更有条理。':'Bring order to\nyour bookmarks.','扫描现有收藏，集中处理重复、长期未使用和失效链接。所有修改均由你确认，不会自动整理。':'Scan your bookmarks and review duplicates, old items, and broken links. Nothing changes without your confirmation.','开始扫描收藏夹':'Scan bookmarks','✓ 默认本地分析':'✓ Local analysis by default','✓ 所有操作可撤销':'✓ Every action is undoable','待整理':'To sort','正在读取收藏夹…':'Reading bookmarks…','当前列表':'Current list','收藏筛选':'Bookmark filters','全部':'All','重复':'Duplicates','一年未打开':'Not opened for a year','一年没打开':'Not opened for a year','失效':'Broken','文件夹':'Folders','按文件夹查看':'Browse by folder','新建文件夹':'New folder','文件夹名称':'Folder name','新建到':'Create in','取消':'Cancel','创建':'Create','原收藏文件夹':'Original bookmark folders','全部文件夹':'All folders','当前文件夹':'Current folder','删除文件夹':'Delete folder','搜索标题、网址或文件夹':'Search title, URL, or folder','全选':'Select all','收藏名称':'Bookmark','收藏时间':'Date saved','状态':'Status','项已选择':'selected','拖到左侧文件夹移动':'Drag to a folder on the left','移动到':'Move to','选择目标文件夹':'Choose destination folder','移动':'Move','导出':'Export','删除':'Delete','取消选择':'Clear selection','确认删除这些收藏？':'Delete these bookmarks?','删除后仍可通过右上角撤销。':'You can undo this from the top right.','确认删除':'Delete','允许检查收藏链接？':'Allow link checking?','需要访问收藏中的网站，才能判断链接是否仍可打开。仅检查响应状态，不保存页面内容。':'Website access is needed to check whether links still open. Only response status is checked; page content is not saved.','仅在你点击检查时使用':'Used only when you start a check','授权一次，后续无需重复确认':'Allow once; no repeated confirmation needed','暂不检查':'Not now','允许并检查':'Allow and check','打开扩展设置':'Open extension settings','跨浏览器迁移':'Cross-browser transfer','导入并比对书签':'Import and compare bookmarks','选择任意浏览器导出的 HTML 文件。文件只在本地解析，不会上传。':'Choose an HTML file exported by any browser. It is parsed locally and never uploaded.','选择书签 HTML 文件':'Choose bookmark HTML file','支持 Chrome、Edge、Firefox、Safari、Atlas 等标准导出文件':'Supports standard exports from Chrome, Edge, Firefox, Safari, Atlas, and more','选择文件':'Choose file','书签文件':'Bookmark file','已完成比对':'Comparison complete','更换文件':'Replace file','比对结果':'Comparison results','文件独有':'File only','信息不同':'Different info','两边都有':'In both','Chrome 独有':'Chrome only','导入到':'Import to','保留原文件夹结构':'Keep original folder structure','关闭':'Close','深度整理':'Organize','智能分类':'Smart sorting','搜索标题、网址或文件夹':'Search title, URL, or folder','收藏概况':'Bookmark overview','同域名':'Same domain','一年未用':'Unused for a year','无记录':'No record','所有文件夹':'All folders','移动到…':'Move to…','删除所选收藏？':'Delete selected bookmarks?','删除后可通过顶部“撤销”恢复。':'Use Undo at the top to restore them.','界面语言':'Language','中文':'中文','未归入子文件夹':'Loose bookmarks','没有匹配的收藏':'No matching bookmarks','换个关键词、文件夹或筛选条件试试。':'Try another keyword, folder, or filter.','没有发现失效链接':'No broken links found','当前范围内的链接暂未发现明确失效。':'No clearly broken links were found in this scope.','这一类已经很干净了':'This category is already clean','可以继续查看其他分类。':'Try another category.','没有重复收藏':'No duplicate bookmarks','当前范围内没有需要处理的同域名收藏。':'No same-domain bookmarks need attention in this scope.','语言':'Language','全部状态':'All statuses','全部时间':'All dates','重复收藏':'Duplicate','失效链接':'Broken link','按状态筛选':'Filter by status','按收藏年份筛选':'Filter by saved year','这个年份下没有收藏':'No bookmarks in this year','可以切换到其他年份，或回到全部时间。':'Try another year or go back to all dates.'
    },
    ja: {
      '收藏夹整理首页':'MarkNest ホーム','收藏夹整理':'ブックマーク整理','撤销上次操作':'前回の操作を元に戻す','撤销':'元に戻す','检查链接':'リンク確認','导入并比对':'インポート・比較','重新扫描':'再スキャン','从这里开始':'ここから開始','让收藏，\n更有条理。':'ブックマークを、\nもっと整然と。','扫描现有收藏，集中处理重复、长期未使用和失效链接。所有修改均由你确认，不会自动整理。':'ブックマークをスキャンし、重複・長期未使用・無効リンクを確認します。変更は自動では行われません。','开始扫描收藏夹':'ブックマークをスキャン','✓ 默认本地分析':'✓ 標準でローカル解析','✓ 所有操作可撤销':'✓ すべて元に戻せます','待整理':'未整理','当前列表':'現在のリスト','全部':'すべて','重复':'重複','一年未打开':'1年間未使用','一年没打开':'1年間未使用','失效':'無効','文件夹':'フォルダ','按文件夹查看':'フォルダ別に表示','新建文件夹':'新規フォルダ','文件夹名称':'フォルダ名','取消':'キャンセル','创建':'作成','全部文件夹':'すべてのフォルダ','当前文件夹':'現在のフォルダ','删除文件夹':'フォルダを削除','搜索标题、网址或文件夹':'タイトル・URL・フォルダを検索','全选':'すべて選択','收藏名称':'ブックマーク','收藏时间':'保存日','状态':'状態','项已选择':'件選択','移动':'移動','导出':'エクスポート','删除':'削除','取消选择':'選択解除','确认删除':'削除する','跨浏览器迁移':'ブラウザ間の移行','导入并比对书签':'ブックマークをインポート・比較','选择任意浏览器导出的 HTML 文件。文件只在本地解析，不会上传。':'ブラウザから書き出した HTML を選択してください。ローカルでのみ解析されます。','选择书签 HTML 文件':'ブックマーク HTML を選択','选择文件':'ファイルを選択','更换文件':'ファイルを変更','文件独有':'ファイルのみ','信息不同':'情報が異なる','两边都有':'両方にある','Chrome 独有':'Chrome のみ','导入到':'インポート先','保留原文件夹结构':'元のフォルダ構成を保持','关闭':'閉じる','深度整理':'詳しく整理','收藏概况':'ブックマーク概要','同域名':'同一ドメイン','一年未用':'1年間未使用','无记录':'記録なし','所有文件夹':'すべてのフォルダ','删除所选收藏？':'選択したブックマークを削除しますか？','界面语言':'言語','未归入子文件夹':'未分類のブックマーク','没有匹配的收藏':'一致するブックマークはありません','没有发现失效链接':'無効なリンクはありません','这一类已经很干净了':'このカテゴリは整理済みです','没有重复收藏':'重複はありません','语言':'言語'
    },
    fr: {
      '收藏夹整理首页':'Accueil MarkNest','收藏夹整理':'Organisateur de favoris','撤销上次操作':'Annuler la dernière action','撤销':'Annuler','检查链接':'Vérifier les liens','导入并比对':'Importer et comparer','重新扫描':'Réanalyser','从这里开始':'Commencer ici','让收藏，\n更有条理。':'Des favoris,\nmieux organisés.','扫描现有收藏，集中处理重复、长期未使用和失效链接。所有修改均由你确认，不会自动整理。':'Analysez les favoris et vérifiez les doublons, les éléments anciens et les liens invalides. Rien ne change sans confirmation.','开始扫描收藏夹':'Analyser les favoris','✓ 默认本地分析':'✓ Analyse locale par défaut','✓ 所有操作可撤销':'✓ Toutes les actions sont annulables','待整理':'À trier','当前列表':'Liste actuelle','全部':'Tous','重复':'Doublons','一年未打开':'Inactifs depuis un an','一年没打开':'Inactifs depuis un an','失效':'Invalides','文件夹':'Dossiers','按文件夹查看':'Parcourir par dossier','新建文件夹':'Nouveau dossier','文件夹名称':'Nom du dossier','取消':'Annuler','创建':'Créer','全部文件夹':'Tous les dossiers','当前文件夹':'Dossier actuel','删除文件夹':'Supprimer le dossier','搜索标题、网址或文件夹':'Rechercher titre, URL ou dossier','全选':'Tout sélectionner','收藏名称':'Favori','收藏时间':'Date d’ajout','状态':'État','项已选择':'sélectionnés','移动':'Déplacer','导出':'Exporter','删除':'Supprimer','取消选择':'Effacer la sélection','确认删除':'Supprimer','跨浏览器迁移':'Migration entre navigateurs','导入并比对书签':'Importer et comparer les favoris','选择任意浏览器导出的 HTML 文件。文件只在本地解析，不会上传。':'Choisissez un fichier HTML exporté par un navigateur. Il est analysé localement et jamais envoyé.','选择书签 HTML 文件':'Choisir un fichier HTML','选择文件':'Choisir un fichier','更换文件':'Changer de fichier','文件独有':'Fichier uniquement','信息不同':'Informations différentes','两边都有':'Présent dans les deux','Chrome 独有':'Chrome uniquement','导入到':'Importer vers','保留原文件夹结构':'Conserver les dossiers d’origine','关闭':'Fermer','深度整理':'Organisation avancée','收藏概况':'Aperçu des favoris','同域名':'Même domaine','一年未用':'Inactifs depuis un an','无记录':'Sans historique','所有文件夹':'Tous les dossiers','删除所选收藏？':'Supprimer les favoris sélectionnés ?','界面语言':'Langue','未归入子文件夹':'Favoris non classés','没有匹配的收藏':'Aucun favori correspondant','没有发现失效链接':'Aucun lien invalide','这一类已经很干净了':'Cette catégorie est déjà propre','没有重复收藏':'Aucun doublon','语言':'Langue'
    },
    de: {
      '收藏夹整理首页':'MarkNest-Startseite','收藏夹整理':'Lesezeichen ordnen','撤销上次操作':'Letzte Aktion rückgängig','撤销':'Rückgängig','检查链接':'Links prüfen','导入并比对':'Importieren & vergleichen','重新扫描':'Neu scannen','从这里开始':'Hier beginnen','让收藏，\n更有条理。':'Lesezeichen,\nbesser geordnet.','扫描现有收藏，集中处理重复、长期未使用和失效链接。所有修改均由你确认，不会自动整理。':'Lesezeichen scannen und Duplikate, alte Einträge sowie defekte Links prüfen. Änderungen erfolgen nur nach Bestätigung.','开始扫描收藏夹':'Lesezeichen scannen','✓ 默认本地分析':'✓ Standardmäßig lokal','✓ 所有操作可撤销':'✓ Alle Aktionen sind widerrufbar','待整理':'Zu sortieren','当前列表':'Aktuelle Liste','全部':'Alle','重复':'Duplikate','一年未打开':'Seit einem Jahr ungenutzt','一年没打开':'Seit einem Jahr ungenutzt','失效':'Defekt','文件夹':'Ordner','按文件夹查看':'Nach Ordner durchsuchen','新建文件夹':'Neuer Ordner','文件夹名称':'Ordnername','取消':'Abbrechen','创建':'Erstellen','全部文件夹':'Alle Ordner','当前文件夹':'Aktueller Ordner','删除文件夹':'Ordner löschen','搜索标题、网址或文件夹':'Titel, URL oder Ordner suchen','全选':'Alle auswählen','收藏名称':'Lesezeichen','收藏时间':'Gespeichert','状态':'Status','项已选择':'ausgewählt','移动':'Verschieben','导出':'Exportieren','删除':'Löschen','取消选择':'Auswahl aufheben','确认删除':'Löschen','跨浏览器迁移':'Browserübergreifender Umzug','导入并比对书签':'Lesezeichen importieren und vergleichen','选择任意浏览器导出的 HTML 文件。文件只在本地解析，不会上传。':'Wähle eine HTML-Datei aus einem Browser. Sie wird nur lokal verarbeitet und nicht hochgeladen.','选择书签 HTML 文件':'Lesezeichen-HTML auswählen','选择文件':'Datei auswählen','更换文件':'Datei wechseln','文件独有':'Nur in Datei','信息不同':'Andere Informationen','两边都有':'In beiden','Chrome 独有':'Nur in Chrome','导入到':'Importieren nach','保留原文件夹结构':'Ursprüngliche Ordnerstruktur behalten','关闭':'Schließen','深度整理':'Gründlich ordnen','收藏概况':'Lesezeichenübersicht','同域名':'Gleiche Domain','一年未用':'Ein Jahr ungenutzt','无记录':'Ohne Verlauf','所有文件夹':'Alle Ordner','删除所选收藏？':'Ausgewählte Lesezeichen löschen?','界面语言':'Sprache','未归入子文件夹':'Lose Lesezeichen','没有匹配的收藏':'Keine passenden Lesezeichen','没有发现失效链接':'Keine defekten Links gefunden','这一类已经很干净了':'Diese Kategorie ist bereits aufgeräumt','没有重复收藏':'Keine Duplikate','语言':'Sprache'
    }
  };

  Object.assign(dictionaries.ja, { '全部状态':'すべての状態', '重复收藏':'重複', '失效链接':'無効リンク', '按状态筛选':'状態で絞り込む' });
  Object.assign(dictionaries.fr, { '全部状态':'Tous les états', '重复收藏':'Doublon', '失效链接':'Lien invalide', '按状态筛选':'Filtrer par état' });
  Object.assign(dictionaries.de, { '全部状态':'Alle Status', '重复收藏':'Duplikat', '失效链接':'Defekter Link', '按状态筛选':'Nach Status filtern' });
  Object.assign(dictionaries.en, {
    '添加':'Add',
    '撤销添加':'Undo add',
    '当前页面无法添加到收藏夹':'This page cannot be added to bookmarks',
    '编辑':'Edit',
    '编辑刚添加的收藏':'Edit just-added bookmark',
    '标题':'Title',
    '收藏已更新':'Bookmark updated',
    '更新收藏失败':'Could not update bookmark',
    '重复网址':'Duplicate URLs',
    '移动到文件夹':'Move to folder',
    '选择文件夹':'Choose a folder',
    '返回收藏列表':'Back to bookmarks',
    '搜索文件夹':'Search folders',
    '查看完整收藏列表':'View all bookmarks',
    '顶层文件夹':'Top-level folder',
    '没有匹配的文件夹':'No matching folders',
    '同站页面':'Same-site pages',
    '没有同站页面':'No same-site pages',
    '当前范围内没有需要处理的同站页面。':'No same-site pages need attention in this scope.',
    '一年未打开':'Not opened for a year',
    '没有一年未打开的收藏':'No bookmarks unopened for a year',
    '搜索收藏':'Search bookmarks'
  });
  Object.assign(dictionaries.ja, {
    '重复网址':'重複URL',
    '移动到文件夹':'フォルダへ移動',
    '选择文件夹':'フォルダを選択',
    '返回收藏列表':'ブックマークに戻る',
    '搜索文件夹':'フォルダを検索',
    '查看完整收藏列表':'すべてのブックマークを表示',
    '顶层文件夹':'最上位フォルダ',
    '没有匹配的文件夹':'一致するフォルダはありません',
    '同站页面':'同一サイトのページ',
    '没有同站页面':'同一サイトのページはありません',
    '当前范围内没有需要处理的同站页面。':'この範囲で整理が必要な同一サイトのページはありません。',
    '没有一年未打开的收藏':'1年間未使用のブックマークはありません',
    '搜索收藏':'ブックマークを検索'
  });
  Object.assign(dictionaries.fr, {
    '重复网址':'URL en double',
    '移动到文件夹':'Déplacer vers un dossier',
    '选择文件夹':'Choisir un dossier',
    '返回收藏列表':'Retour aux favoris',
    '搜索文件夹':'Rechercher des dossiers',
    '查看完整收藏列表':'Afficher tous les favoris',
    '顶层文件夹':'Dossier principal',
    '没有匹配的文件夹':'Aucun dossier correspondant',
    '同站页面':'Pages du même site',
    '没有同站页面':'Aucune page du même site',
    '当前范围内没有需要处理的同站页面。':'Aucune page du même site à traiter dans cette portée.',
    '没有一年未打开的收藏':'Aucun favori inutilisé depuis un an',
    '搜索收藏':'Rechercher des favoris'
  });
  Object.assign(dictionaries.de, {
    '重复网址':'Doppelte URLs',
    '移动到文件夹':'In Ordner verschieben',
    '选择文件夹':'Ordner auswählen',
    '返回收藏列表':'Zurück zu den Lesezeichen',
    '搜索文件夹':'Ordner suchen',
    '查看完整收藏列表':'Alle Lesezeichen anzeigen',
    '顶层文件夹':'Ordner der obersten Ebene',
    '没有匹配的文件夹':'Keine passenden Ordner',
    '同站页面':'Seiten derselben Website',
    '没有同站页面':'Keine Seiten derselben Website',
    '当前范围内没有需要处理的同站页面。':'In diesem Bereich gibt es keine Seiten derselben Website, die bearbeitet werden müssen.',
    '没有一年未打开的收藏':'Keine seit einem Jahr ungeöffneten Lesezeichen',
    '搜索收藏':'Lesezeichen suchen'
  });

  Object.assign(dictionaries.en, {
    '全选文件独有项':'Select all file-only items',
    '可选择导入到 Chrome':'Select bookmarks to import into Chrome',
    '选择导入目标文件夹':'Choose import destination',
    '导入所选':'Import selected',
    '这些网址尚未存在于 Chrome，可选择导入':'These URLs are not in Chrome yet. Select the ones to import.',
    '网址相同，但名称或所在文件夹不同':'Same URL, but the title or folder is different',
    '名称、网址和文件夹均一致':'Title, URL, and folder all match',
    '这些网址只存在于当前 Chrome 收藏夹':'These URLs exist only in the current Chrome bookmarks',
    '可导入':'Ready to import',
    '仅在 Chrome':'Chrome only',
    '这一组没有内容':'Nothing in this group'
  });
  Object.assign(dictionaries.ja, {
    '全选文件独有项':'ファイルのみの項目をすべて選択',
    '可选择导入到 Chrome':'Chrome に取り込む項目を選択できます',
    '选择导入目标文件夹':'インポート先を選択',
    '导入所选':'選択項目をインポート',
    '这些网址尚未存在于 Chrome，可选择导入':'Chrome にない URL を選んでインポートできます。',
    '网址相同，但名称或所在文件夹不同':'URL は同じですが、名前またはフォルダが異なります',
    '名称、网址和文件夹均一致':'名前、URL、フォルダがすべて一致します',
    '这些网址只存在于当前 Chrome 收藏夹':'現在の Chrome ブックマークにのみ存在します',
    '可导入':'インポート可能',
    '仅在 Chrome':'Chrome のみ',
    '这一组没有内容':'このグループは空です'
  });
  Object.assign(dictionaries.fr, {
    '全选文件独有项':'Sélectionner tous les éléments propres au fichier',
    '可选择导入到 Chrome':'Sélectionnez les favoris à importer dans Chrome',
    '选择导入目标文件夹':'Choisir le dossier de destination',
    '导入所选':'Importer la sélection',
    '这些网址尚未存在于 Chrome，可选择导入':'Ces URL ne sont pas encore dans Chrome. Sélectionnez celles à importer.',
    '网址相同，但名称或所在文件夹不同':'Même URL, mais nom ou dossier différent',
    '名称、网址和文件夹均一致':'Le nom, l’URL et le dossier correspondent',
    '这些网址只存在于当前 Chrome 收藏夹':'Ces URL existent uniquement dans les favoris Chrome actuels',
    '可导入':'Prêt à importer',
    '仅在 Chrome':'Chrome uniquement',
    '这一组没有内容':'Aucun élément dans ce groupe'
  });
  Object.assign(dictionaries.de, {
    '全选文件独有项':'Alle nur in der Datei vorhandenen Einträge auswählen',
    '可选择导入到 Chrome':'Lesezeichen zum Importieren in Chrome auswählen',
    '选择导入目标文件夹':'Importziel auswählen',
    '导入所选':'Auswahl importieren',
    '这些网址尚未存在于 Chrome，可选择导入':'Diese URLs fehlen in Chrome. Wählen Sie die zu importierenden Einträge aus.',
    '网址相同，但名称或所在文件夹不同':'Gleiche URL, aber anderer Name oder Ordner',
    '名称、网址和文件夹均一致':'Name, URL und Ordner stimmen überein',
    '这些网址只存在于当前 Chrome 收藏夹':'Diese URLs sind nur in den aktuellen Chrome-Lesezeichen vorhanden',
    '可导入':'Importierbar',
    '仅在 Chrome':'Nur in Chrome',
    '这一组没有内容':'Diese Gruppe ist leer'
  });

  // Bookmark editor copy. User-entered titles and paths are never dictionary keys.
  Object.assign(dictionaries.en, {
    "添加": "Add",
    "编辑": "Edit",
    "撤销上一步": "Undo last action",
    "撤销添加": "Undo add",
    "已撤销添加": "Bookmark addition undone",
    "撤销编辑": "Undo edit",
    "已撤销编辑": "Bookmark edit undone",
    "撤销移动": "Undo move",
    "撤销删除": "Undo delete",
    "添加书签": "New bookmark",
    "收藏当前页面": "Save this page",
    "编辑收藏": "Edit bookmark",
    "关闭编辑": "Close editor",
    "名称": "Name",
    "保存位置": "Save to",
    "保存书签": "Save bookmark",
    "保存修改": "Save changes",
    "正在保存…": "Saving…",
    "收起目录": "Close folders",
    "文件夹路径": "Folder path",
    "打开子文件夹": "Browse subfolders",
    "Enter 保存 · Esc 返回": "Enter to save · Esc to return",
    "给它一个好名字，放在顺手的位置。": "A useful name. A place you’ll remember.",
    "起个好找的名字，放到合适的位置。": "A useful name. A place you’ll remember.",
    "这个页面已经收藏，可以直接修改。": "Already bookmarked. Make any changes here.",
    "请选择保存位置": "Choose a destination",
    "请输入收藏名称": "Enter a bookmark name",
    "请选择有效的保存位置": "Choose an available folder",
    "这个文件夹已不可用，请重新选择": "This folder is unavailable. Choose another.",
    "此收藏或文件夹为只读，请选择其他位置": "This bookmark or folder is read-only. Choose another location.",
    "修改未完全完成，请检查名称和位置后重试": "Some changes could not be saved. Check the name and folder, then retry.",
    "保存失败，你的输入已保留，请重试": "Couldn’t save. Your changes are still here—please retry.",
    "这条收藏已移除或无法编辑": "This bookmark was removed or cannot be edited",
    "无法读取当前页面，请重新打开插件": "Couldn’t read this page. Reopen MarkNest and try again.",
    "当前页面无法添加到收藏夹": "This page cannot be bookmarked",
    "已保存，请重新打开插件刷新列表": "Saved. Reopen MarkNest to refresh the list.",
    "已保存，暂时无法记录撤销": "Saved. Undo is temporarily unavailable.",
    "撤销失败，请重试": "Couldn’t undo. Please retry.",
    "操作记录已更新，请使用顶部撤销": "Action history changed. Use Undo at the top.",
    "未能撤销，请检查收藏或文件夹后重试": "Couldn’t undo. Check the bookmark or folder and retry.",
    "读取失败": "Couldn’t load bookmarks",
    "请在扩展管理页确认收藏权限。": "Check bookmark access on the extensions page.",
    "筛选文件夹": "Filter folders"
  });
  Object.assign(dictionaries.ja, {
    "添加": "追加",
    "编辑": "編集",
    "撤销上一步": "前の操作を元に戻す",
    "撤销添加": "追加を元に戻す",
    "已撤销添加": "追加を取り消しました",
    "撤销编辑": "編集を元に戻す",
    "已撤销编辑": "編集を取り消しました",
    "撤销移动": "移動を元に戻す",
    "撤销删除": "削除を元に戻す",
    "添加书签": "ブックマークを追加",
    "收藏当前页面": "このページを保存",
    "编辑收藏": "ブックマークを編集",
    "关闭编辑": "編集画面を閉じる",
    "名称": "名前",
    "保存位置": "保存先",
    "保存书签": "保存",
    "保存修改": "変更を保存",
    "正在保存…": "保存中…",
    "收起目录": "フォルダを閉じる",
    "文件夹路径": "フォルダの場所",
    "打开子文件夹": "サブフォルダを開く",
    "Enter 保存 · Esc 返回": "Enter で保存 · Esc で戻る",
    "给它一个好名字，放在顺手的位置。": "見つけやすい名前と、使いやすい保存先に。",
    "起个好找的名字，放到合适的位置。": "見つけやすい名前と、使いやすい保存先に。",
    "这个页面已经收藏，可以直接修改。": "保存済みのページです。ここで変更できます。",
    "请选择保存位置": "保存先を選択",
    "请输入收藏名称": "ブックマーク名を入力してください",
    "请选择有效的保存位置": "利用できる保存先を選んでください",
    "这个文件夹已不可用，请重新选择": "このフォルダは利用できません。選び直してください。",
    "此收藏或文件夹为只读，请选择其他位置": "このブックマークまたはフォルダは読み取り専用です。別の場所を選んでください。",
    "修改未完全完成，请检查名称和位置后重试": "一部の変更を保存できませんでした。名前と保存先を確認して再試行してください。",
    "保存失败，你的输入已保留，请重试": "保存できませんでした。入力は保持されています。再試行してください。",
    "这条收藏已移除或无法编辑": "このブックマークは削除されたか、編集できません",
    "无法读取当前页面，请重新打开插件": "ページを読み取れませんでした。MarkNest を開き直してください。",
    "当前页面无法添加到收藏夹": "このページはブックマークに追加できません",
    "已保存，请重新打开插件刷新列表": "保存しました。一覧を更新するには MarkNest を開き直してください。",
    "已保存，暂时无法记录撤销": "保存しました。現在、元に戻す操作は利用できません。",
    "撤销失败，请重试": "元に戻せませんでした。再試行してください。",
    "操作记录已更新，请使用顶部撤销": "操作履歴が更新されました。上部の「元に戻す」を使ってください。",
    "未能撤销，请检查收藏或文件夹后重试": "元に戻せませんでした。ブックマークやフォルダを確認して再試行してください。",
    "读取失败": "読み込みに失敗しました",
    "请在扩展管理页确认收藏权限。": "拡張機能の管理画面でブックマークへのアクセス権を確認してください。",
    "筛选文件夹": "フォルダを絞り込む"
  });
  Object.assign(dictionaries.fr, {
    "添加": "Ajouter",
    "编辑": "Modifier",
    "撤销上一步": "Annuler la dernière action",
    "撤销添加": "Annuler l’ajout",
    "已撤销添加": "Ajout annulé",
    "撤销编辑": "Annuler la modification",
    "已撤销编辑": "Modification annulée",
    "撤销移动": "Annuler le déplacement",
    "撤销删除": "Annuler la suppression",
    "添加书签": "Nouveau favori",
    "收藏当前页面": "Enregistrer cette page",
    "编辑收藏": "Modifier le favori",
    "关闭编辑": "Fermer l’éditeur",
    "名称": "Nom",
    "保存位置": "Emplacement",
    "保存书签": "Enregistrer",
    "保存修改": "Enregistrer",
    "正在保存…": "Enregistrement…",
    "收起目录": "Masquer les dossiers",
    "文件夹路径": "Chemin du dossier",
    "打开子文件夹": "Parcourir les sous-dossiers",
    "Enter 保存 · Esc 返回": "Entrée : enregistrer · Échap : retour",
    "给它一个好名字，放在顺手的位置。": "Un nom utile, un emplacement facile à retrouver.",
    "起个好找的名字，放到合适的位置。": "Un nom utile, un emplacement facile à retrouver.",
    "这个页面已经收藏，可以直接修改。": "Cette page est déjà enregistrée. Modifiez-la ici.",
    "请选择保存位置": "Choisissez un emplacement",
    "请输入收藏名称": "Saisissez un nom pour le favori",
    "请选择有效的保存位置": "Choisissez un dossier disponible",
    "这个文件夹已不可用，请重新选择": "Ce dossier n’est plus disponible. Choisissez-en un autre.",
    "此收藏或文件夹为只读，请选择其他位置": "Ce favori ou dossier est en lecture seule. Choisissez un autre emplacement.",
    "修改未完全完成，请检查名称和位置后重试": "Certaines modifications n’ont pas été enregistrées. Vérifiez le nom et le dossier, puis réessayez.",
    "保存失败，你的输入已保留，请重试": "Enregistrement impossible. Votre saisie est conservée. Réessayez.",
    "这条收藏已移除或无法编辑": "Ce favori a été supprimé ou ne peut pas être modifié",
    "无法读取当前页面，请重新打开插件": "Impossible de lire cette page. Rouvrez MarkNest et réessayez.",
    "当前页面无法添加到收藏夹": "Cette page ne peut pas être ajoutée aux favoris",
    "已保存，请重新打开插件刷新列表": "Enregistré. Rouvrez MarkNest pour actualiser la liste.",
    "已保存，暂时无法记录撤销": "Enregistré. L’annulation est temporairement indisponible.",
    "撤销失败，请重试": "Impossible d’annuler. Réessayez.",
    "操作记录已更新，请使用顶部撤销": "L’historique a changé. Utilisez Annuler en haut.",
    "未能撤销，请检查收藏或文件夹后重试": "Impossible d’annuler. Vérifiez le favori ou le dossier, puis réessayez.",
    "读取失败": "Chargement impossible",
    "请在扩展管理页确认收藏权限。": "Vérifiez l’accès aux favoris dans la page des extensions.",
    "筛选文件夹": "Filtrer les dossiers"
  });
  Object.assign(dictionaries.de, {
    "添加": "Hinzufügen",
    "编辑": "Bearbeiten",
    "撤销上一步": "Letzte Aktion rückgängig",
    "撤销添加": "Hinzufügen rückgängig",
    "已撤销添加": "Hinzufügen rückgängig gemacht",
    "撤销编辑": "Bearbeitung rückgängig",
    "已撤销编辑": "Bearbeitung rückgängig gemacht",
    "撤销移动": "Verschieben rückgängig",
    "撤销删除": "Löschen rückgängig",
    "添加书签": "Neues Lesezeichen",
    "收藏当前页面": "Diese Seite speichern",
    "编辑收藏": "Lesezeichen bearbeiten",
    "关闭编辑": "Bearbeitung schließen",
    "名称": "Name",
    "保存位置": "Speichern unter",
    "保存书签": "Speichern",
    "保存修改": "Speichern",
    "正在保存…": "Wird gespeichert…",
    "收起目录": "Ordner schließen",
    "文件夹路径": "Ordnerpfad",
    "打开子文件夹": "Unterordner öffnen",
    "Enter 保存 · Esc 返回": "Enter speichern · Esc zurück",
    "给它一个好名字，放在顺手的位置。": "Ein guter Name. Ein passender Platz.",
    "起个好找的名字，放到合适的位置。": "Ein guter Name. Ein passender Platz.",
    "这个页面已经收藏，可以直接修改。": "Diese Seite ist schon gespeichert. Hier lässt sie sich bearbeiten.",
    "请选择保存位置": "Speicherort wählen",
    "请输入收藏名称": "Bitte einen Namen eingeben",
    "请选择有效的保存位置": "Bitte einen verfügbaren Ordner wählen",
    "这个文件夹已不可用，请重新选择": "Dieser Ordner ist nicht verfügbar. Bitte einen anderen wählen.",
    "此收藏或文件夹为只读，请选择其他位置": "Dieses Lesezeichen oder dieser Ordner ist schreibgeschützt. Bitte einen anderen Ort wählen.",
    "修改未完全完成，请检查名称和位置后重试": "Einige Änderungen konnten nicht gespeichert werden. Name und Ordner prüfen, dann erneut versuchen.",
    "保存失败，你的输入已保留，请重试": "Speichern fehlgeschlagen. Ihre Eingaben bleiben erhalten. Bitte erneut versuchen.",
    "这条收藏已移除或无法编辑": "Dieses Lesezeichen wurde entfernt oder kann nicht bearbeitet werden",
    "无法读取当前页面，请重新打开插件": "Diese Seite konnte nicht gelesen werden. MarkNest erneut öffnen.",
    "当前页面无法添加到收藏夹": "Diese Seite kann nicht als Lesezeichen gespeichert werden",
    "已保存，请重新打开插件刷新列表": "Gespeichert. MarkNest erneut öffnen, um die Liste zu aktualisieren.",
    "已保存，暂时无法记录撤销": "Gespeichert. Rückgängig ist derzeit nicht verfügbar.",
    "撤销失败，请重试": "Rückgängig fehlgeschlagen. Bitte erneut versuchen.",
    "操作记录已更新，请使用顶部撤销": "Der Verlauf hat sich geändert. Bitte oben „Rückgängig“ verwenden.",
    "未能撤销，请检查收藏或文件夹后重试": "Rückgängig fehlgeschlagen. Lesezeichen oder Ordner prüfen und erneut versuchen.",
    "读取失败": "Laden fehlgeschlagen",
    "请在扩展管理页确认收藏权限。": "Lesezeichen-Zugriff auf der Erweiterungsseite prüfen.",
    "筛选文件夹": "Ordner filtern"
  });

  Object.assign(dictionaries.en, { '收藏没有变化': 'No changes to save' });
  Object.assign(dictionaries.ja, { '收藏没有变化': '変更はありません' });
  Object.assign(dictionaries.fr, { '收藏没有变化': 'Aucune modification à enregistrer' });
  Object.assign(dictionaries.de, { '收藏没有变化': 'Keine Änderungen zu speichern' });

  let locale = FALLBACK;
  let applying = false;
  const textState = new WeakMap();
  const attrState = new WeakMap();

  function normalizeLocale(value) {
    const normalized = String(value || '').replace('_', '-').toLowerCase();
    if (normalized.startsWith('zh')) return 'zh-CN';
    const language = normalized.split('-')[0];
    return SUPPORTED.includes(language) ? language : FALLBACK;
  }

  // Dynamic copy contains counts and bookmark/folder names, so it cannot be
  // represented by the plain source-text dictionary above. Keep these small
  // templates here so confirmation dialogs remain one language end to end.
  function translateDynamic(source) {
    if (locale === FALLBACK) return null;
    let match = source.match(/^已保存到：([\s\S]*)$/);
    if (match) {
      const path = match[1];
      return {
        en: `Saved to: ${path}`,
        ja: `保存先：${path}`,
        fr: `Enregistré dans : ${path}`,
        de: `Gespeichert in: ${path}`
      }[locale];
    }
    match = source.match(/^选择 ([\s\S]+)$/);
    if (match) {
      const title = match[1];
      return { en: `Select ${title}`, ja: `${title} を選択`, fr: `Sélectionner ${title}`, de: `${title} auswählen` }[locale];
    }
    match = source.match(/^确认删除这 (\d+) 个收藏？$/);
    if (match) {
      const count = match[1];
      return {
        en: `Delete ${count} bookmark${count === '1' ? '' : 's'}?`,
        ja: `${count} 件のブックマークを削除しますか？`,
        fr: `Supprimer ${count} favori${count === '1' ? '' : 's'} ?`,
        de: `${count} Lesezeichen löschen?`
      }[locale];
    }
    if (source === '可通过右上角撤销恢复。') {
      return { en: 'You can restore it with Undo in the top right.', ja: '右上の「元に戻す」で復元できます。', fr: 'Vous pouvez le restaurer avec Annuler en haut à droite.', de: 'Sie können es oben rechts mit „Rückgängig“ wiederherstellen.' }[locale];
    }
    match = source.match(/^将删除 (\d+) 个收藏，可通过右上角撤销恢复。$/);
    if (match) {
      const count = match[1];
      return {
        en: `Delete ${count} bookmark${count === '1' ? '' : 's'}. You can restore ${count === '1' ? 'it' : 'them'} with Undo in the top right.`,
        ja: `${count} 件のブックマークを削除します。右上の「元に戻す」で復元できます。`,
        fr: `Supprimer ${count} favori${count === '1' ? '' : 's'}. Vous pourrez les restaurer avec Annuler en haut à droite.`,
        de: `${count} Lesezeichen löschen. Sie können sie oben rechts mit „Rückgängig“ wiederherstellen.`
      }[locale];
    }
    match = source.match(/^将删除 (\d+) 个收藏，可通过顶部“撤销”恢复。$/);
    if (match) {
      const count = match[1];
      return {
        en: `Delete ${count} bookmark${count === '1' ? '' : 's'}. Use Undo at the top to restore ${count === '1' ? 'it' : 'them'}.`,
        ja: `${count} 件のブックマークを削除します。上部の「元に戻す」で復元できます。`,
        fr: `Supprimer ${count} favori${count === '1' ? '' : 's'}. Utilisez Annuler en haut pour les restaurer.`,
        de: `${count} Lesezeichen löschen. Mit „Rückgängig“ oben können Sie sie wiederherstellen.`
      }[locale];
    }
    match = source.match(/^删除“(.+)”整个文件夹？$/);
    if (match) {
      const name = match[1];
      return { en: `Delete the entire “${name}” folder?`, ja: `「${name}」フォルダ全体を削除しますか？`, fr: `Supprimer tout le dossier « ${name} » ?`, de: `Den gesamten Ordner „${name}“ löschen?` }[locale];
    }
    match = source.match(/^将同时删除 (\d+) 个收藏和 (\d+) 个子文件夹。完整层级会先保存，可通过右上角撤销恢复。$/);
    if (match) {
      const [, bookmarks, folders] = match;
      return {
        en: `This also deletes ${bookmarks} bookmark${bookmarks === '1' ? '' : 's'} and ${folders} subfolder${folders === '1' ? '' : 's'}. The full structure is saved and can be restored with Undo in the top right.`,
        ja: `ブックマーク ${bookmarks} 件と子フォルダ ${folders} 個も削除されます。完全な構成は保存され、右上の「元に戻す」で復元できます。`,
        fr: `Cela supprimera aussi ${bookmarks} favori${bookmarks === '1' ? '' : 's'} et ${folders} sous-dossier${folders === '1' ? '' : 's'}. La structure complète est enregistrée et peut être restaurée avec Annuler.`,
        de: `Dabei werden auch ${bookmarks} Lesezeichen und ${folders} Unterordner gelöscht. Die vollständige Struktur wird gespeichert und kann oben rechts wiederhergestellt werden.`
      }[locale];
    }
    if (source === '删除整个文件夹') {
      return { en: 'Delete folder', ja: 'フォルダ全体を削除', fr: 'Supprimer le dossier', de: 'Ordner löschen' }[locale];
    }
    match = source.match(/^文件中读取 (\d+) 条，按网址去重后 (\d+) 条$/);
    if (match) {
      const [, total, unique] = match;
      return {
        en: `${total} read from the file; ${unique} unique URLs`,
        ja: `ファイルから ${total} 件を読み込み、URL 重複排除後 ${unique} 件`,
        fr: `${total} éléments lus ; ${unique} URL uniques`,
        de: `${total} Einträge gelesen; ${unique} eindeutige URLs`
      }[locale];
    }
    match = source.match(/^导入所选(?: (\d+) 项)?$/);
    if (match) {
      const count = match[1];
      if (!count) return dictionaries[locale]?.['导入所选'];
      return {
        en: `Import ${count} selected`,
        ja: `選択した ${count} 件をインポート`,
        fr: `Importer ${count} éléments`,
        de: `${count} ausgewählte importieren`
      }[locale];
    }
    match = source.match(/^文件：(.+) · Chrome：(.+)$/);
    if (match) {
      return {
        en: `File: ${match[1]} · Chrome: ${match[2]}`,
        ja: `ファイル：${match[1]} · Chrome：${match[2]}`,
        fr: `Fichier : ${match[1]} · Chrome : ${match[2]}`,
        de: `Datei: ${match[1]} · Chrome: ${match[2]}`
      }[locale];
    }
    return null;
  }

  function translate(source) {
    if (locale === FALLBACK) return source;
    const dynamic = translateDynamic(source);
    if (dynamic) return dynamic;
    const dict = dictionaries[locale] || dictionaries.en;
    if (dict[source] !== undefined) return dict[source];
    const itemMatch = source.match(/^(\d+)\s*项$/);
    if (itemMatch) return locale === 'ja' ? `${itemMatch[1]} 件` : locale === 'fr' ? `${itemMatch[1]} élément(s)` : locale === 'de' ? `${itemMatch[1]} Einträge` : `${itemMatch[1]} items`;
    const selectedMatch = source.match(/^将删除\s*(\d+)\s*个收藏/);
    if (selectedMatch) return locale === 'ja' ? `${selectedMatch[1]} 件のブックマークを削除します。上部から元に戻せます。` : locale === 'fr' ? `${selectedMatch[1]} favoris seront supprimés. Vous pourrez annuler en haut.` : locale === 'de' ? `${selectedMatch[1]} Lesezeichen werden gelöscht. Oben kann dies rückgängig gemacht werden.` : `${selectedMatch[1]} bookmarks will be deleted. Use Undo at the top to restore them.`;
    return source;
  }

  function translateTextNode(node) {
    if (node.parentElement?.closest('[translate="no"]')) return;
    const current = node.nodeValue;
    if (!current || !current.trim()) return;
    const previous = textState.get(node);
    let source = previous?.source;
    if (!previous || current !== previous.rendered) source = current;
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    const core = source.trim();
    const rendered = `${leading}${translate(core)}${trailing}`;
    textState.set(node, { source, rendered });
    if (current !== rendered) node.nodeValue = rendered;
  }

  function translateAttributes(element) {
    if (element.closest?.('[translate="no"]')) return;
    const attributes = ['placeholder', 'title', 'aria-label'];
    let states = attrState.get(element) || {};
    for (const name of attributes) {
      if (name === 'title' && element.hasAttribute('data-user-title')) continue;
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name);
      const previous = states[name];
      const source = !previous || current !== previous.rendered ? current : previous.source;
      const rendered = translate(source);
      states[name] = { source, rendered };
      if (current !== rendered) element.setAttribute(name, rendered);
    }
    attrState.set(element, states);
  }

  function apply(root = document) {
    applying = true;
    document.documentElement.lang = locale;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script, style')) continue;
      translateTextNode(node);
    }
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    root.querySelectorAll?.('*').forEach(translateAttributes);
    applying = false;
  }

  async function setLocale(nextLocale) {
    locale = SUPPORTED.includes(nextLocale) ? nextLocale : FALLBACK;
    try { await chrome.storage.local.set({ [STORAGE_KEY]: locale }); } catch {}
    apply(document);
    document.dispatchEvent(new CustomEvent('marknest:localechange', { detail: { locale } }));
  }

  const ready = (async () => {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      if (SUPPORTED.includes(stored?.[STORAGE_KEY])) {
        locale = stored[STORAGE_KEY];
      } else {
        locale = normalizeLocale(chrome.i18n?.getUILanguage?.() || navigator.language);
      }
    } catch {
      locale = normalizeLocale(navigator.language);
    }
    apply(document);
    const observer = new MutationObserver(records => {
      if (applying) return;
      for (const record of records) {
        if (record.type === 'characterData') translateTextNode(record.target);
        record.addedNodes?.forEach(added => {
          if (added.nodeType === Node.TEXT_NODE) translateTextNode(added);
          else if (added.nodeType === Node.ELEMENT_NODE) apply(added);
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return locale;
  })();

  window.MarkNestI18n = { ready, apply, setLocale, getLocale: () => locale, languages: SUPPORTED };
})();
