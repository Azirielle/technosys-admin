"""
tokenize-classes.py: swaps the old hard-coded colour classes for UI-library token classes.

Usage:  python scripts/tokenize-classes.py <file> [<file> ...]
It only rewrites class names (e.g. "text-[#121215] dark:text-[#F4F4F6]" -> "text-ink").
Buttons, tables and modals still have to be swapped for library components by hand.
Prints how many replacements it made per file. Safe to run twice.
"""
import re
import sys

O = r"(?:/\[?0?\.\d+\]?|/\d+)?"  # optional opacity suffix like /[0.05] or /40

# Order matters: light+dark pairs first, then single leftovers.
RULES = [
    # ---- text ----
    (r"text-\[#121215\] dark:text-\[#F4F4F6\]", "text-ink"),
    (r"text-\[#575762\] dark:text-\[#B0B2BD\]", "text-ink-2"),
    (r"text-\[#8E8D9A\] dark:text-\[#7A7C88\]", "text-ink-3"),
    (r"text-\[#7A7C88\] dark:text-\[#9A9BA6\]", "text-ink-3"),
    (r"text-\[#4D55CC\] dark:text-(?:indigo-400|\[#818cf8\]|\[#7A82E6\])", "text-ink"),
    (r"text-zinc-900 dark:text-zinc-(?:50|100)", "text-ink"),
    (r"text-zinc-(?:800|700) dark:text-zinc-(?:200|300)", "text-ink"),
    (r"text-zinc-(?:600|500) dark:text-zinc-(?:300|400)", "text-ink-2"),
    (r"text-zinc-400 dark:text-zinc-(?:500|600)", "text-ink-3"),
    (r"hover:text-\[#121215\] dark:hover:text-\[#F4F4F6\]", "hover:text-ink"),
    (r"dark:(?:[a-z-]+:)*text-\[#(?:F4F4F6|f4f4f6)\]", ""),
    (r"(?<![\w:-])text-\[#(?:F4F4F6|f4f4f6)\]", "text-on-action"),
    (r"text-\[#121215\]", "text-ink"),
    (r"text-\[#(?:575762|B0B2BD)\]", "text-ink-2"),
    (r"dark:text-\[#(?:B0B2BD|7A7C88|9A9BA6)\]", ""),
    (r"text-\[#(?:8E8D9A|7A7C88|9A9BA6)\]", "text-ink-3"),
    (r"text-\[#4D55CC\]", "text-ink"),
    (r"dark:text-(?:indigo|blue)-[34]00", ""),
    (r"text-\[#FAF9FB\]", "text-on-action"),
    # ---- backgrounds ----
    (r"bg-\[#FAF9FB\]" + O + r" dark:bg-\[#(?:2B2C35|1E1F27|22232A)\]" + O, "bg-surface"),
    (r"bg-\[#(?:EBEAEF|F5F4F7|F7F6F9)\]" + O + r" dark:bg-\[#(?:343640|22232A|282935|262732|3E404D)\]" + O, "bg-surface-soft"),
    (r"bg-\[#E4E4EA\] dark:bg-\[#1A1B20\]", "bg-bg"),
    (r"bg-\[#4D55CC\] hover:bg-\[#4338CA\]", "bg-action hover:bg-action-hover"),
    (r"hover:bg-\[#4338CA\]", "hover:bg-action-hover"),
    (r"bg-\[#4D55CC\]" + O, "bg-action"),
    (r"bg-\[#121215\] dark:bg-\[#(?:F4F4F6|1E1F27)\]", "bg-action"),
    (r"bg-white dark:bg-zinc-(?:900|950)" + O, "bg-surface"),
    (r"bg-zinc-50" + O + r" dark:bg-zinc-(?:800|900|950)" + O, "bg-surface-soft"),
    (r"bg-zinc-100" + O + r" dark:bg-zinc-(?:800|900)" + O, "bg-surface-soft"),
    (r"bg-black/\[0\.0[3-8]\] dark:bg-white/\[0\.(?:0[4-9]|1\d?)\]", "bg-surface-soft"),
    (r"bg-\[#FAF9FB\]" + O, "bg-surface"),
    (r"bg-\[#(?:EBEAEF|F5F4F7|F7F6F9)\]" + O, "bg-surface-soft"),
    (r"dark:bg-\[#(?:2B2C35|343640|22232A|1E1F27|282935|262732|1A1B20|1A1B23|3E404D)\]" + O, ""),
    # ---- hovers ----
    (r"hover:bg-black/\[0\.0[2-8]\] dark:hover:bg-white/\[0\.(?:0[3-9]|1\d?)\]", "hover:bg-surface-soft"),
    (r"hover:bg-zinc-(?:50|100)" + O + r" dark:hover:bg-zinc-(?:700|800)" + O, "hover:bg-surface-soft"),
    (r"hover:text-\[#121215\] dark:hover:text-\[#F4F4F6\]", "hover:text-ink"),
    (r"hover:text-zinc-(?:900|700) dark:hover:text-zinc-(?:100|200)", "hover:text-ink"),
    # ---- borders and dividers ----
    (r"border-black/\[0\.0\d\] dark:border-white/\[0\.(?:0\d|1\d?)\]", "border-line"),
    (r"border-zinc-(?:100|200)" + O + r" dark:border-zinc-(?:700|800)" + O, "border-line"),
    (r"divide-black/\[0\.0\d\] dark:divide-white/\[0\.(?:0\d|1\d?)\]", "divide-line"),
    (r"divide-zinc-(?:100|200)" + O + r" dark:divide-zinc-800" + O, "divide-line"),
    (r"border-\[#(?:DDDCE2|EBEAEF)\] dark:border-\[#(?:3E404D|343640)\]", "border-line"),
    (r"border-\[#4D55CC\]" + O, "border-ink"),
    (r"(?:focus(?:-visible)?:)?ring-\[#4D55CC\]" + O, "ring-focus"),
    (r"(?:focus(?:-visible)?:)?outline-\[#4D55CC\]", "outline-focus"),
    # ---- status colours ----
    (r"bg-(?:rose|red)-50" + O + r" dark:bg-(?:rose|red)-950" + O, "bg-danger-soft"),
    (r"bg-emerald-50" + O + r" dark:bg-emerald-950" + O, "bg-success-soft"),
    (r"bg-(?:amber|yellow)-50" + O + r" dark:bg-(?:amber|yellow)-950" + O, "bg-warning-soft"),
    (r"bg-(?:blue|indigo)-50" + O + r" dark:bg-(?:blue|indigo)-950" + O, "bg-info-soft"),
    (r"text-(?:rose|red)-[67]00 dark:text-(?:rose|red)-[34]00", "text-danger"),
    (r"text-emerald-[67]00 dark:text-emerald-[34]00", "text-success"),
    (r"text-(?:amber|yellow)-[6-8]00 dark:text-(?:amber|yellow)-[34]00", "text-warning"),
    (r"text-(?:blue|indigo)-[67]00 dark:text-(?:blue|indigo)-[34]00", "text-info"),
    (r"border-(?:rose|red|emerald|amber|yellow|blue|indigo)-[12]00" + O + r" dark:border-(?:rose|red|emerald|amber|yellow|blue|indigo)-[89]00" + O, "border-transparent"),
    (r"bg-(?:rose|red)-600 hover:bg-(?:rose|red)-700", "bg-danger-solid hover:opacity-90"),
    (r"hover:bg-(?:rose|red)-50" + O + r" dark:hover:bg-(?:rose|red)-950" + O, "hover:bg-danger-soft"),
    # ---- any dark: variant still left is redundant: tokens switch for dark mode by themselves ----
    (r"dark:(?:[a-z-]+:)*(?:text|bg|border|divide|ring|placeholder)-(?:\[#[0-9A-Fa-f]{6}\]|[a-z]+-\d+|white|black|white/\[[0-9.]+\]|black/\[[0-9.]+\])" + O, ""),
    # ---- single leftovers (no dark pair) ----
    (r"(?<![\w:-])bg-(?:blue|indigo|purple|violet|emerald)-600 hover:bg-(?:blue|indigo|purple|violet|emerald)-700", "bg-action hover:bg-action-hover"),
    (r"hover:bg-(?:blue|indigo|purple|violet|emerald)-700", "hover:bg-action-hover"),
    (r"(?<![\w:-])bg-(?:blue|indigo|purple|violet)-600", "bg-action"),
    (r"(?<![\w:-])bg-zinc-900", "bg-action"),
    (r"(?:focus(?:-visible)?:)?ring-(?:blue|indigo|purple|violet|emerald|rose)-500" + O, "ring-focus"),
    (r"placeholder-(?:zinc-400|\[#8E8D9A\])", "placeholder:text-ink-3"),
    (r"(hover:|group-hover:)?text-zinc-(?:800|900)", r"\1text-ink"),
    (r"(hover:|group-hover:)?text-zinc-(?:500|600|700)", r"\1text-ink-2"),
    (r"(hover:|group-hover:)?text-zinc-(?:300|400)", r"\1text-ink-3"),
    (r"(hover:)?bg-zinc-(?:50|100|200)" + O, r"\1bg-surface-soft"),
    (r"(?<![\w:-])bg-white(?![\w/-])", "bg-surface"),
    (r"hover:border-zinc-\d+", "hover:border-line-strong"),
    (r"border-zinc-\d+" + O, "border-line"),
    (r"bg-black/(?:40|50|60|70|75)", "bg-scrim"),
    # status families: soft fills, text, dots
    (r"bg-(?:rose|red)-(?:500/10|500/15|50|100)(?![\d/])", "bg-danger-soft"),
    (r"bg-(?:emerald|green)-(?:500/10|500/15|50|100)(?![\d/])", "bg-success-soft"),
    (r"bg-(?:amber|yellow)-(?:500/10|500/15|50|100)(?![\d/])", "bg-warning-soft"),
    (r"bg-(?:blue|sky|indigo|purple|violet)-(?:500/10|500/15|50|100)(?![\d/])", "bg-info-soft"),
    (r"(hover:|group-hover:)?text-(?:rose|red)-[5-8]00", r"\1text-danger"),
    (r"(hover:|group-hover:)?text-(?:emerald|green)-[5-8]00", r"\1text-success"),
    (r"(hover:|group-hover:)?text-(?:amber|yellow)-[5-8]00", r"\1text-warning"),
    (r"(hover:|group-hover:)?text-(?:purple|violet|sky)-[5-8]00", r"\1text-info"),
    (r"(hover:|group-hover:)?text-(?:blue|indigo)-[5-8]00", r"\1text-ink"),
    (r"(?<![\w:-])bg-(?:rose|red)-500", "bg-danger"),
    (r"(?<![\w:-])bg-(?:emerald|green)-[56]00", "bg-success"),
    (r"(?<![\w:-])bg-(?:amber|yellow)-500", "bg-warning"),
    (r"(?<![\w:-])bg-(?:blue|sky|purple)-500(?![\w/])", "bg-info"),
    (r"border-(?:rose|red|emerald|green|amber|yellow|blue|sky|indigo|purple|violet)-(?:[1-3]00|500/\d+)" + O, "border-transparent"),
    (r"border-(?:blue|indigo|purple)-[56]00", "border-ink"),
    (r"dark:(?:[a-z-]+:)+(?=\s|`|\"|$)", ""),
    # ---- weights and case (sentence case, max 600) ----
    (r"font-(?:extrabold|black|bold)", "font-semibold"),
    (r"\buppercase tracking-(?:wider|widest|wide)\b", ""),
    (r"\btracking-(?:wider|widest)\b", ""),
    (r"(?<=[\s\"'`])uppercase(?=[\s\"'`])", ""),
    # ---- font sizes onto the token scale (nothing below 11px) ----
    (r"text-\[(?:8|9|10|11)px\]", "text-micro"),
    (r"text-\[12px\]", "text-caption"),
    (r"text-\[13px\]", "text-small"),
    # ---- radius ----
    (r"rounded-\[28px\]", "rounded-modal"),
    (r"rounded-2xl", "rounded-card"),
]


def pill_buttons(text: str):
    """Class strings that paint an action button (bg-action or bg-danger-solid) get pill corners."""
    def fix(m):
        cls = m.group(0)
        if re.search(r"(?<![\w:-])bg-action(?![\w-])", cls):
            # text on the action colour must flip with it (light text in light mode, dark in dark)
            cls = re.sub(r"(?<![\w:-])text-(?:ink|white)(?![\w/-])", "text-on-action", cls)
        if re.search(r"(?<![\w:-])bg-(?:action|danger-solid)(?![\w-])", cls) and re.search(r"\bp[xy]-", cls):
            return re.sub(r"\brounded-(?:sm|md|lg|xl|card)\b", "rounded-pill", cls)
        return cls
    return re.sub(r"className=(?:\"[^\"]*\"|\{`[^`]*`\})|'[^'\n]*bg-action[^'\n]*'", fix, text)


def tokenize(text: str):
    total = 0
    for pattern, replacement in RULES:
        text, n = re.subn(pattern, replacement, text)
        total += n
    text = pill_buttons(text)
    # tidy double spaces left inside class strings
    text = re.sub(r'(className=(?:"|\{`)[^"`]*)', lambda m: re.sub(r" {2,}", " ", m.group(1)), text)
    return text, total


if __name__ == "__main__":
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as f:
            original = f.read()
        updated, count = tokenize(original)
        if updated != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(updated)
        print(f"{count:5d}  {path}")
