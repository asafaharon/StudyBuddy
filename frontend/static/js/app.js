let currentExamData = null;
let userAnswers = {};
let currentStudentName = ""; // משתנה לשמירת שם התלמיד במבחן כיתה
let isStudentMode = false;   // דגל לבדיקת סוג הצפייה במבחן

const API_BASE = '/api/v1';

function showView(viewId) {
    ['upload-view', 'loading-view', 'exam-view'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// 0. בדיקה בטעינת העמוד: האם הגענו דרך לינק שיתוף?
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const regularExamId = urlParams.get('exam_id');
    const studentExamId = urlParams.get('student_exam');

    const activeExamId = regularExamId || studentExamId;

    if (activeExamId) {
        showView('loading-view');

        if (studentExamId) {
            isStudentMode = true;
            document.getElementById('loading-status').innerText = "מכין מבחן כיתה...";
        } else {
            document.getElementById('loading-status').innerText = "טוען מבחן משותף מהארכיון...";
        }

        try {
            const res = await fetch(`${API_BASE}/exam/${activeExamId}`);
            if (!res.ok) throw new Error("המבחן לא נמצא, ייתכן שהלינק פג תוקף.");

            currentExamData = await res.json();
            cleanExamData(currentExamData);
            document.getElementById('exam-date').innerText = new Date().toLocaleDateString('he-IL');

            renderExam(currentExamData);

            if (isStudentMode) {
                toggleStudentUI();
                // הקפצת חלון הרשמת תלמיד
                document.getElementById('student-modal').classList.remove('hidden');
            } else {
                toggleViewerUI(); // מצב צפייה רגיל (ללא סמכויות מורה)
            }

            showView('exam-view');
        } catch (error) {
            alert(error.message);
            window.history.replaceState({}, document.title, window.location.pathname);
            showView('upload-view');
        }
    }
});

// ניהול הרשמת תלמיד לפני התחלת המבחן
document.getElementById('start-student-exam-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('student-name-input').value.trim();
    if (!nameInput) {
        alert("נא להזין שם מלא כדי להתחיל את המבחן.");
        return;
    }
    currentStudentName = nameInput;
    document.getElementById('student-modal').classList.add('hidden');
});

// פונקציות לשליטה על ממשק המשתמש (כפתורים שונים למורה/תלמיד)
function toggleTeacherUI() {
    document.getElementById('share-class-btn').classList.remove('hidden');
    document.getElementById('view-results-btn').classList.remove('hidden');
    document.getElementById('download-solved-btn').classList.remove('hidden');
    document.getElementById('share-btn').classList.remove('hidden');
    document.getElementById('submit-exam').classList.remove('hidden');
    document.getElementById('toolbar-separator').classList.remove('hidden');

    document.getElementById('submit-student-exam-btn').classList.add('hidden');
}

function toggleStudentUI() {
    // הסתרת כלי המורה ושיתוף
    document.getElementById('share-class-btn').classList.add('hidden');
    document.getElementById('view-results-btn').classList.add('hidden');
    document.getElementById('download-solved-btn').classList.add('hidden');
    document.getElementById('share-btn').classList.add('hidden');
    document.getElementById('submit-exam').classList.add('hidden');
    document.getElementById('toolbar-separator').classList.add('hidden');

    // הצגת כפתור הגשה למורה
    document.getElementById('submit-student-exam-btn').classList.remove('hidden');
}

function toggleViewerUI() {
    // צופה רגיל - רואה רק שיתוף, בדיקה עצמית והורדה רגילה
    document.getElementById('share-class-btn').classList.add('hidden');
    document.getElementById('view-results-btn').classList.add('hidden');
    document.getElementById('submit-student-exam-btn').classList.add('hidden');

    document.getElementById('share-btn').classList.remove('hidden');
    document.getElementById('submit-exam').classList.remove('hidden');
    document.getElementById('download-solved-btn').classList.remove('hidden');
}

// פונקציית ניקוי טקסט
function cleanExamData(exam) {
    const removeBrackets = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/[()[\]]/g, '').replace(/\s{2,}/g, ' ').trim();
    };

    if (exam.title) exam.title = removeBrackets(exam.title);
    if (exam.questions) {
        exam.questions.forEach(q => {
            q.question_text = removeBrackets(q.question_text);
            q.correct_answer = removeBrackets(q.correct_answer);
            q.explanation = removeBrackets(q.explanation);
            if (q.options) {
                q.options = q.options.map(opt => removeBrackets(opt));
            }
        });
    }
}

// 1. העלאת חומר חדש ויצירת מבחן (הופך אותך למורה)
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sourceText = document.getElementById('source-text').value;
    const instructions = document.getElementById('custom-instructions').value;
    const fileInput = document.getElementById('file-upload').files[0];

    if (!sourceText.trim() && !fileInput) {
        alert("נא להזין חומר לימוד - הדבק טקסט או העלה קובץ.");
        return;
    }

    showView('loading-view');
    const loadingStatus = document.getElementById('loading-status');

    try {
        loadingStatus.innerText = "הספרן מתייק את החומר...";

        const formData = new FormData();
        if (sourceText.trim()) formData.append("text_content", sourceText);
        if (fileInput) formData.append("file", fileInput);

        const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error("שגיאה בהעלאת החומר");

        const uploadData = await uploadRes.json();

        loadingStatus.innerText = "הארכיטקט והפרופסור מעבדים את הנתונים...";

        const generateRes = await fetch(`${API_BASE}/generate-exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: uploadData.session_id, custom_instructions: instructions })
        });

        if (!generateRes.ok) throw new Error("הסוכנים לא הצליחו לייצר מבחן. נסה להעלות טקסט מפורט יותר.");

        currentExamData = await generateRes.json();
        cleanExamData(currentExamData);

        document.getElementById('exam-date').innerText = new Date().toLocaleDateString('he-IL');

        renderExam(currentExamData);
        toggleTeacherUI(); // כי אתה יצרת את המבחן
        showView('exam-view');

    } catch (error) {
        console.error("Workflow Error:", error);
        alert("אופס! משהו השתבש: " + error.message);
        showView('upload-view');
    }
});

// 2. רינדור המבחן למסך
function renderExam(exam) {
    document.getElementById('exam-title').innerText = exam.title;
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    userAnswers = {};

    const submitBtn = document.getElementById('submit-exam');
    submitBtn.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
    submitBtn.disabled = false;

    const studentSubmitBtn = document.getElementById('submit-student-exam-btn');
    studentSubmitBtn.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
    studentSubmitBtn.disabled = false;

    exam.questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'mb-8 avoid-page-break';

        let html = `<h3 class="font-bold text-xl text-slate-800 mb-4 leading-relaxed"><span class="text-purple-600 mr-1">${index + 1}.</span> ${q.question_text}</h3>`;

        const isMultipleChoice = q.options && q.options.length > 0;

        if (isMultipleChoice) {
            if (!q.shuffledOptions) {
                q.shuffledOptions = [...new Set([...q.options, q.correct_answer])].sort(() => Math.random() - 0.5);
            }

            html += `<div class="space-y-3 pr-6">`;
            q.shuffledOptions.forEach((opt) => {
                html += `
                    <label class="flex items-start p-3 border border-transparent rounded-lg cursor-pointer hover:bg-slate-50 transition-all duration-200 group">
                        <input type="radio" name="${q.id}" value="${opt}" class="ml-4 mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300">
                        <span class="text-slate-700 font-medium group-hover:text-purple-700 transition-colors">${opt}</span>
                    </label>
                `;
            });
            html += `</div>`;
        } else {
            html += `<div class="mt-4"><textarea name="${q.id}" rows="3" class="w-full border-b-2 border-slate-200 bg-slate-50/50 p-4 rounded-t-lg outline-none focus:border-purple-500 focus:bg-purple-50/30 transition-all resize-none" placeholder="הקלד את תשובתך כאן..."></textarea></div>`;
        }

        html += `
            <div id="explanation-${q.id}" class="hidden mt-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 shadow-sm">
                <div class="font-bold text-purple-800 mb-2">התשובה המצופה:</div>
                <div class="mb-4 font-medium text-slate-700 pr-4">${q.correct_answer}</div>
                <div class="font-bold text-indigo-800 mb-2">הסבר ה-AI:</div>
                <div class="pr-4 text-slate-600 leading-relaxed">${q.explanation}</div>
            </div>
        `;

        qDiv.innerHTML = html;
        container.appendChild(qDiv);

        if (isMultipleChoice) {
            qDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => { userAnswers[q.id] = e.target.value; });
            });
        } else {
            qDiv.querySelector(`textarea[name="${q.id}"]`).addEventListener('input', (e) => { userAnswers[q.id] = e.target.value; });
        }
    });
}

// פונקציית עזר לבדיקה ויזואלית של המבחן על המסך
function markExamAndGetScore() {
    let score = 0;
    let mcqCount = 0;

    currentExamData.questions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        const isMultipleChoice = q.options && q.options.length > 0;

        if (isMultipleChoice) {
            mcqCount++;
            const isCorrect = userAnswer === q.correct_answer;
            document.querySelectorAll(`input[name="${q.id}"]`).forEach(radio => {
                radio.disabled = true;
                const labelDiv = radio.parentElement;

                if (radio.value === q.correct_answer) {
                    labelDiv.classList.add('bg-emerald-50', 'border-emerald-200');
                    labelDiv.querySelector('span').classList.add('text-emerald-700', 'font-bold');
                } else if (radio.value === userAnswer && !isCorrect) {
                    labelDiv.classList.add('bg-red-50', 'border-red-200');
                    labelDiv.querySelector('span').classList.add('text-red-600', 'line-through');
                }
            });
            if (isCorrect) score++;
        } else {
            const textarea = document.querySelector(`textarea[name="${q.id}"]`);
            if(textarea) {
                textarea.disabled = true;
                textarea.classList.add('bg-slate-100', 'text-slate-500');
            }
        }

        document.getElementById(`explanation-${q.id}`).classList.remove('hidden');
    });

    return mcqCount > 0 ? Math.round((score / mcqCount) * 100) : 100;
}

// 3. הגשת המבחן (בדיקה עצמית)
document.getElementById('submit-exam').addEventListener('click', () => {
    const gradePercent = markExamAndGetScore();
    document.getElementById('submit-exam').classList.add('hidden');

    const scoreBadge = document.createElement('span');
    scoreBadge.id = "score-badge";
    scoreBadge.className = 'inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 rounded-full text-xl font-bold mr-4 shadow-md';
    scoreBadge.innerText = `ציון: ${gradePercent}`;
    document.getElementById('exam-title').appendChild(scoreBadge);

    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 3.5 הגשת מבחן למורה (תלמיד)
document.getElementById('submit-student-exam-btn').addEventListener('click', async () => {
    // וידוא שהתלמיד ענה על משהו לפני הגשה (אופציונלי)
    if(Object.keys(userAnswers).length === 0) {
        if(!confirm("לא סימנת אף תשובה. האם אתה בטוח שברצונך להגיש?")) return;
    }

    const btn = document.getElementById('submit-student-exam-btn');
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin inline-block mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> מגיש למורה...`;
    btn.disabled = true;

    const gradePercent = markExamAndGetScore();

    try {
        const res = await fetch(`${API_BASE}/submit-exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam_id: currentExamData.id,
                student_name: currentStudentName,
                score: gradePercent
            })
        });

        if (!res.ok) throw new Error("שגיאה בהגשת התוצאה לשרת.");

        btn.classList.add('hidden');

        const scoreBadge = document.createElement('span');
        scoreBadge.id = "score-badge";
        scoreBadge.className = 'inline-block bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-xl font-bold mr-4 shadow-md';
        scoreBadge.innerText = `הוגש! ציון: ${gradePercent}`;
        document.getElementById('exam-title').appendChild(scoreBadge);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        alert(`כל הכבוד ${currentStudentName}! המבחן הוגש למורה בהצלחה. (ציון: ${gradePercent})`);

    } catch (err) {
        alert(err.message);
        btn.innerText = "נסה שוב";
        btn.disabled = false;
    }
});

// 4. העתקת לינק שיתוף רגיל
document.getElementById('share-btn').addEventListener('click', async () => {
    if (!currentExamData || !currentExamData.id) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?exam_id=${currentExamData.id}`;
    copyUrlToClipboard(shareUrl, 'share-btn', 'הקישור הועתק!', 'bg-blue-600', 'hover:bg-blue-500');
});

// 4.5 העתקת לינק שיתוף לכיתה
document.getElementById('share-class-btn').addEventListener('click', async () => {
    if (!currentExamData || !currentExamData.id) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?student_exam=${currentExamData.id}`;
    copyUrlToClipboard(shareUrl, 'share-class-btn', 'קישור לכיתה הועתק!', 'bg-indigo-600', 'hover:bg-indigo-500');
});

async function copyUrlToClipboard(url, btnId, successText, origBgClass, origHoverClass) {
    try {
        await navigator.clipboard.writeText(url);
        const btn = document.getElementById(btnId);
        const originalHtml = btn.innerHTML;

        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span class="hidden sm:inline">${successText}</span>`;
        btn.classList.replace(origBgClass, 'bg-green-500');
        btn.classList.replace(origHoverClass, 'hover:bg-green-400');

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.replace('bg-green-500', origBgClass);
            btn.classList.replace('hover:bg-green-400', origHoverClass);
        }, 3000);

    } catch (err) {
        alert(`הנה הקישור שלך:\n${url}`);
    }
}

// 5. צפייה בתוצאות (מורה)
document.getElementById('view-results-btn').addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_BASE}/exam/${currentExamData.id}/results`);
        if (!res.ok) throw new Error("לא ניתן היה למשוך את התוצאות.");
        const data = await res.json();

        const tbody = document.getElementById('results-table-body');
        tbody.innerHTML = '';

        if (data.submissions.length === 0) {
            document.getElementById('no-results-msg').classList.remove('hidden');
            document.querySelector('#teacher-results-modal table').classList.add('hidden');
        } else {
            document.getElementById('no-results-msg').classList.add('hidden');
            document.querySelector('#teacher-results-modal table').classList.remove('hidden');

            data.submissions.forEach(sub => {
                let badgeClass = sub.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                 sub.score >= 60 ? 'bg-amber-100 text-amber-700' :
                                 'bg-red-100 text-red-700';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-4 font-medium text-slate-800 border-b border-slate-100">${sub.student_name}</td>
                        <td class="p-4 text-center border-b border-slate-100">
                            <span class="inline-block px-3 py-1 rounded-full text-sm font-bold ${badgeClass}">${sub.score}%</span>
                        </td>
                        <td class="p-4 text-slate-500 text-sm border-b border-slate-100 text-left" dir="ltr">${sub.timestamp}</td>
                    </tr>
                `;
            });
        }

        document.getElementById('teacher-results-modal').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('close-results-btn').addEventListener('click', () => {
    document.getElementById('teacher-results-modal').classList.add('hidden');
});

// 6. מערכת יצירת PDF
async function generatePDF(isSolved) {
    if (!currentExamData) return;

    const hiddenWrapper = document.createElement('div');
    hiddenWrapper.style.height = '0px';
    hiddenWrapper.style.width = '0px';
    hiddenWrapper.style.overflow = 'hidden';

    const tempDiv = document.createElement('div');
    tempDiv.className = 'a4-page p-12 sm:p-20 bg-white text-slate-800';
    tempDiv.style.width = '210mm';
    tempDiv.dir = 'rtl';

    let html = `
        <div class="flex justify-between items-end mb-12 border-b-2 border-slate-100 pb-6" dir="rtl">
            <div>
                <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">${currentExamData.title} ${isSolved ? '<span class="text-indigo-600 text-2xl">(פתרון מלא)</span>' : ''}</h2>
                <p class="text-slate-400 mt-2 font-medium">הופק אוטומטית ע"י StudyBuddy AI</p>
            </div>
            <div class="text-right">
                <span class="block text-slate-800 font-bold text-xl">${new Date().toLocaleDateString('he-IL')}</span>
            </div>
        </div>
        <div class="space-y-10" dir="rtl">
    `;

    currentExamData.questions.forEach((q, index) => {
        html += `<div class="mb-8 avoid-page-break">`;
        html += `<h3 class="font-bold text-xl text-slate-800 mb-4 leading-relaxed"><span class="text-purple-600 mr-1">${index + 1}.</span> ${q.question_text}</h3>`;

        const isMultipleChoice = q.options && q.options.length > 0;

        if (isMultipleChoice) {
            html += `<div class="space-y-3 pr-6">`;
            q.shuffledOptions.forEach(opt => {
                const isCorrect = isSolved && opt === q.correct_answer;
                const styleClass = isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold border rounded-lg p-3' : 'border border-transparent p-3';
                const checked = isCorrect ? 'checked="checked"' : '';

                html += `
                    <div class="flex items-start ${styleClass}">
                        <input type="radio" ${checked} class="ml-4 mt-1 h-4 w-4 text-purple-600 border-slate-300">
                        <span class="${isCorrect ? 'text-emerald-800' : 'text-slate-700'} font-medium">${opt}</span>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            if (isSolved) {
                html += `<div class="mt-4 p-4 bg-slate-50 border-b-2 border-slate-300 rounded-t-lg"><span class="font-bold text-slate-700">תשובה:</span></div>`;
            } else {
                html += `<div class="mt-4"><div class="w-full border-b-2 border-slate-300 border-dashed h-10 mb-2"></div><div class="w-full border-b-2 border-slate-300 border-dashed h-10 mb-2"></div><div class="w-full border-b-2 border-slate-300 border-dashed h-10"></div></div>`;
            }
        }

        if (isSolved) {
            html += `
                <div class="mt-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                    <div class="font-bold text-purple-800 mb-2">💡 התשובה המצופה:</div>
                    <div class="mb-4 font-medium text-slate-800">${q.correct_answer}</div>
                    <div class="font-bold text-indigo-800 mb-2">📚 הסבר ה-AI:</div>
                    <div class="text-slate-700 leading-relaxed">${q.explanation}</div>
                </div>
            `;
        }
        html += `</div>`;
    });

    html += `</div>`;
    tempDiv.innerHTML = html;

    hiddenWrapper.appendChild(tempDiv);
    document.body.appendChild(hiddenWrapper);

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `${currentExamData.title.replace(/[:"/\\?]/g, "")}${isSolved ? '_פתרון' : '_ריק'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    const btnId = isSolved ? 'download-solved-btn' : 'download-blank-btn';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;

    btn.innerHTML = `<svg class="w-4 h-4 animate-spin inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span class="hidden sm:inline ml-2">מכין קובץ...</span>`;
    btn.disabled = true;

    try {
        await html2pdf().set(opt).from(tempDiv).save();
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        hiddenWrapper.remove();
    }
}

document.getElementById('download-blank-btn').addEventListener('click', () => generatePDF(false));
document.getElementById('download-solved-btn').addEventListener('click', () => generatePDF(true));

// 7. חזרה למסך הראשי
document.getElementById('back-btn').addEventListener('click', () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    document.getElementById('upload-form').reset();
    currentExamData = null;
    userAnswers = {};
    currentStudentName = "";
    isStudentMode = false;
    document.getElementById('questions-container').innerHTML = '';
    const badge = document.getElementById('score-badge');
    if(badge) badge.remove();
    showView('upload-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});