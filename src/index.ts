const ctx = document.createElement("canvas").getContext("2d")!;

function measureText(text: string, font?: string) {
    if (font) {
        ctx.font = font;
    }
    return ctx.measureText(text).width;
}

enum SegmentType {
    Char = 0,
    LTag = 2,
    RTag = 3,
}
type Segment =
    | [type: SegmentType.Char, char: string, width: number]
    | [type: SegmentType.LTag, tag: string, raw: string]
    | [type: SegmentType.RTag, tag: string, raw: string];

export default function ellipsis(
    text: string,
    width: number,
    offsets: number | [number] | [number, number] = [0, 0],
    ellipsis = "...",
    font = "10px sans-serif",
    html = true
) {
    let offsetHead: number, offsetTail: number;
    if (typeof offsets === "number") {
        offsetHead = offsets;
        offsetTail = offsets;
    } else {
        offsetHead = offsets[0];
        offsetTail = offsets[1] === undefined ? offsetHead : offsets[1];
    }

    const re = /<\/{0,1}(\w+)>/g;
    const segments: Segment[] = [];
    const ellipsisWidth = measureText(ellipsis, font);

    let cursor = 0;

    let head = "";
    let headLength = 0;
    let headWidth = 0;
    const headTags: Segment[] = [];

    while (true) {
        const match = html ? re.exec(text) : null;
        if (match) {
            while (cursor < match.index) {
                const strWidth = measureText(text[cursor], font);
                if (headLength < offsetHead) {
                    head += text[cursor];
                    headLength += 1;
                    headWidth += strWidth;
                } else {
                    segments.push([SegmentType.Char, text[cursor], strWidth]);
                }
                cursor += 1;
            }

            const seg: Segment =
                match[0][1] === "/"
                    ? [SegmentType.RTag, match[1], match[0]]
                    : [SegmentType.LTag, match[1], match[0]];
            if (headLength < offsetHead) {
                head += match[0];
                if (seg[0] === SegmentType.RTag) {
                    if (
                        headTags.length &&
                        headTags[headTags.length - 1][1] === seg[1]
                    ) {
                        headTags.pop();
                    }
                } else {
                    headTags.push(seg);
                }
            } else {
                segments.push(seg);
            }

            cursor = match.index + match[0].length;
        } else {
            while (cursor < text.length) {
                const strWidth = measureText(text[cursor], font);
                if (headLength < offsetHead) {
                    head += text[cursor];
                    headLength += 1;
                    headWidth += strWidth;
                } else {
                    segments.push([SegmentType.Char, text[cursor], strWidth]);
                }
                cursor += 1;
            }
            break;
        }
    }

    let tail = "";
    let tailLength = 0;
    let tailWidth = 0;
    const tailTags: Segment[] = [];

    while (segments.length && tailLength < offsetTail) {
        const seg = segments.pop()!;

        if (seg[0] === SegmentType.RTag) {
            tail = seg[2] + tail;
            tailTags.push(seg);
        } else if (seg[0] === SegmentType.Char) {
            tail = seg[1] + tail;
            tailWidth += seg[2];
            tailLength += 1;
        } else {
            tail = seg[2] + tail;
            if (
                tailTags.length &&
                tailTags[tailTags.length - 1][1] === seg[1]
            ) {
                tailTags.pop();
            }
        }
    }

    if (tailTags.length) {
        const tempSegments = headTags.concat(segments);
        for (let i = tempSegments.length - 1; i >= 0; i--) {
            const seg = tempSegments[i];
            if (tailTags.length) {
                if (
                    seg[0] === SegmentType.LTag &&
                    tailTags[tailTags.length - 1][1] === seg[1]
                ) {
                    tail = seg[2] + tail;
                    tailTags.pop();
                }
            } else {
                break;
            }
        }
    }

    while (tailTags.length) {
        tail = `<${tailTags.pop()![1]}>` + tail;
    }

    const maxHeadWidth = width - tailWidth - ellipsisWidth;
    if (maxHeadWidth > 0) {
        while (segments.length) {
            const seg = segments.shift()!;
            if (seg[0] === SegmentType.LTag) {
                head += seg[2];
                headTags.push(seg);
            } else if (seg[0] === SegmentType.Char) {
                headWidth += seg[2];
                if (headWidth > maxHeadWidth) {
                    break;
                }
                head += seg[1];
            } else {
                head += seg[2];
                if (
                    headTags.length &&
                    headTags[headTags.length - 1][1] === seg[1]
                ) {
                    headTags.pop();
                }
            }
        }
    }

    if (
        segments.length &&
        segments.some((seg) => seg[0] === SegmentType.Char)
    ) {
        head += ellipsis;
    }

    while (headTags.length) {
        head += `</${headTags.pop()![1]}>`;
    }

    return head + tail;
}
