import React, {Fragment, useState} from 'react';
import './App.css';
import data from './final_vie_coref.json'
// import data from './final_english_coref.json'
import {Highlight} from "./Highlight";
import {Container, Pagination} from "react-bootstrap";


/**
 * Helper function for transforming response data into a tree object.
 *
 * @param {string[]} tokens a list of strings of each of the tokens (words or punctuation) present
 * @param {{ labelString: number[][] } | number[][][]} clusters a collection of arrays that specify spans to be clustered in the original list of tokens
 */



const highlightColors = [
    "blue",
    "green",
    "pink",
    "orange",
    "light_green",
    "yellow",
    "purple",
    "teal",
    "tan",
    "red",
    "cobalt",
    "brown",
    "slate",
    "fuchsia",
    "gray",
    "blue_gray",
    "indigo",
];

/**
 * Matches an index with a color. If index is greater than number of colors, cycle through colors.
 * @param {number} index
 */
export const getHighlightColor = (index) => {
    if (index <= highlightColors.length) {
        return highlightColors[index];
    } else {
        return highlightColors[index - (highlightColors.length * Math.floor(index / highlightColors.length))];
    }
}

const transformToTree = (sentences, clusters) => {
    // Span tree data transform code courtesy of Michael S.
    function contains(span, index) {
        return index >= span[1] && index < span[2];
    }

    let insideClusters = [
        {
            cluster: -1,
            sentence: -1,
            contents: [],
            end: -1
        }
    ];
    sentences.forEach((sentence, sentence_index) => {
        sentence.forEach((token, i) => {
            // Find all the new clusters we are entering at the current index
            let newClusters = [];
            Object.keys(clusters).forEach((key, j) => {
                const cluster = clusters[key];

                if (cluster.length > 0) {
                    // Make sure we're not already in this cluster
                    if (!insideClusters.map((c) => c.cluster).includes(key)) {
                        cluster.every((span, index) => {
                            // Make sure cluster in this sentence
                            if (span[0] === sentence_index && contains(span, i)) {
                                newClusters.push({end: span[2], cluster: key, clusterIndex: j});
                                return false
                            }
                            return true
                        })
                    }
                }
            });

            // Enter each new cluster, starting with the leftmost
            newClusters.sort(function (a, b) {
                return b.end - a.end
            }).forEach((newCluster) => {
                // Descend into the new cluster
                insideClusters.push(
                    {
                        cluster: newCluster.cluster,
                        contents: [],
                        end: newCluster.end,
                        clusterIndex: newCluster.clusterIndex
                    }
                );
            });

            // Add the current token into the current cluster
            insideClusters[insideClusters.length - 1].contents.push(token);

            // Exit each cluster we're at the end of
            while (insideClusters.length > 0 && insideClusters[insideClusters.length - 1].end - 1 === i) {
                const topCluster = insideClusters.pop();
                insideClusters[insideClusters.length - 1].contents.push(topCluster);
                // print(topCluster)
            }
        });
    })
    return insideClusters[0].contents;
}

const HighLightContainer = props => {
    const {           // All fields optional:
        children,       // object | string
        isClicking,     // boolean
        layout,         // string (supported values: "bottom-labels", null)
        className
    } = props;

    const containerClasses = `passage
      model__content__summary
      highlight-container
      ${layout ? "highlight-container--" + layout : ""}
      ${isClicking ? "clicking" : ""}
      ${className || ""}`;

    return (
        <div className={containerClasses}>
            {children}
        </div>
    );
}

/**
 * Not meant to be used outside of the Nested Highlight.
 */
const InnerHighlight = props => {
    const {
        // activeDepths,
        // activeIds,
        data,
        depth,
        // isClickable,
        // isClicking,
        labelPosition,
        // onMouseDown,
        // onMouseOut,
        // onMouseOver,
        // onMouseUp,
        // selectedId,
        highlightColor,
        tokenSeparator
    } = props;
    const lenData = data.length;
    return (
        data.map((token, idx) => {
            return typeof (token) === "object" && !(React.isValidElement(token)) ? (
                <Highlight
                    // activeDepths={activeDepths}
                    // activeIds={activeIds}
                    color={
                        (typeof highlightColor === 'function'
                            ? highlightColor(token)
                            : highlightColor) ||
                        getHighlightColor(token.clusterIndex)}
                    depth={depth}
                    id={token.cluster}
                    // isClickable={isClickable}
                    // isClicking={isClicking}
                    key={idx}
                    label={token.cluster}
                    labelPosition={labelPosition}
                    // onMouseDown={onMouseDown}
                    // onMouseOut={onMouseOut}
                    // onMouseOver={onMouseOver}
                    // onMouseUp={onMouseUp}
                    // selectedId={selectedId}
                >
                    <InnerHighlight
                        // activeDepths={activeDepths}
                        // activeIds={activeIds}
                        data={token.contents}
                        depth={depth + 1}
                        // isClickable={isClickable}
                        // isClicking={isClicking}
                        labelPosition={labelPosition}
                        // onMouseDown={onMouseDown}
                        // onMouseOut={onMouseOut}
                        // onMouseOver={onMouseOver}
                        // onMouseUp={onMouseUp}
                        // selectedId={selectedId}
                    />
                </Highlight>
            ) : (
                <span key={idx}>{token}{idx === lenData - 1 ? null : tokenSeparator || <>&nbsp;</>}</span>
            )
        })
    )
}

const NestedHighlight = props => {
    const {
        // activeDepths,
        // activeIds,
        // isClickable,
        // isClicking,
        labelPosition,
        // onMouseDown,
        // onMouseOut,
        // onMouseOver,
        // onMouseUp,
        // selectedId,
        highlightColor,
        // tokenSeparator,
        treeData
    } = props;

    return (<HighLightContainer>
        <InnerHighlight
            // activeDepths={activeDepths}
            //             activeIds={activeIds}
            data={treeData}
            depth={0}
            // isClickable={isClickable}
            // isClicking={isClicking}
            labelPosition={labelPosition}
            // onMouseDown={onMouseDown}
            // onMouseOut={onMouseOut}
            // onMouseOver={onMouseOver}
            // onMouseUp={onMouseUp}
            // selectedId={selectedId}
            highlightColor={highlightColor}
            // tokenSeparator={tokenSeparator}
        />
    </HighLightContainer>)
}


const toHTML = ({sentences, mention_clusters}) => {
    const data = transformToTree(sentences, mention_clusters)
    return <NestedHighlight treeData={data}
                            labelPosition='left'
    />
}


const LEFT_PAGE = 'LEFT';
const RIGHT_PAGE = 'RIGHT';

/**
 * Helper method for creating a range of numbers
 * range(1, 5) => [1, 2, 3, 4, 5]
 */
const range = (from, to, step = 1) => {
    let i = from;
    const range = [];

    while (i <= to) {
        range.push(i);
        i += step;
    }

    return range;
}

class CusPagination extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentPage: 1
        }
        const {pageCount = null, pageNeighbours = 0} = props;
        this.pageCount = typeof pageCount === 'number' ? pageCount : 0;
        // pageNeighbours can be: 0, 1 or 2
        this.pageNeighbours = typeof pageNeighbours === 'number'
            ? Math.max(0, Math.min(pageNeighbours, 2))
            : 0;
    }

    fetchPageNumber = () => {
        const pageCount = this.pageCount;
        const pageNeighbours = 2;
        const currentPage = this.state.currentPage;

        /*
        * totalNumbers: the total page numbers to show on the control
        * totalBlocks: totalNumbers + 2 to cover for the left(<) and right(>) controls
        * */
        const totalNumbers = pageNeighbours * 2 + 3;
        const totalBlocks = totalNumbers + 2;

        if (pageCount > totalBlocks) {

            const startPage = Math.max(2, currentPage - pageNeighbours);
            const endPage = Math.min(pageCount - 1, currentPage + pageNeighbours);

            let pages = range(startPage, endPage);

            /**
             * hasLeftSpill: has hidden pages to the left
             * hasRightSpill: has hidden pages to the right
             * spillOffset: number of hidden pages either to the left or to the right
             */
            const hasLeftSpill = startPage > 2;
            const hasRightSpill = (pageCount - endPage) > 1;
            const spillOffset = totalNumbers - (pages.length + 1);

            switch (true) {
                // handle: (1) < {5 6} [7] {8 9} (10)
                case (hasLeftSpill && !hasRightSpill): {
                    const extraPages = range(startPage - spillOffset, startPage - 1);
                    pages = [LEFT_PAGE, ...extraPages, ...pages];
                    break;
                }

                // handle: (1) {2 3} [4] {5 6} > (10)
                case (!hasLeftSpill && hasRightSpill): {
                    const extraPages = range(endPage + 1, endPage + spillOffset);
                    pages = [...pages, ...extraPages, RIGHT_PAGE];
                    break;
                }

                // handle: (1) < {4 5} [6] {7 8} > (10)
                case (hasLeftSpill && hasRightSpill):
                default: {
                    pages = [LEFT_PAGE, ...pages, RIGHT_PAGE];
                    break;
                }
            }

            return [1, ...pages, pageCount];

        }
    }

    componentDidMount() {
        this.gotoPage(1);
    }

    gotoPage = page => {
        const {onPageChanged = f => f} = this.props;

        const currentPage = Math.max(0, Math.min(page, this.pageCount));

        const paginationData = {
            currentPage: currentPage,
            pageCount: this.pageCount,
        };

        this.setState({currentPage}, () => onPageChanged(paginationData));
    }

    handleClick = page => evt => {
        evt.preventDefault();
        this.gotoPage(page)
    }

    handleMoveLeft = evt => {
        evt.preventDefault();
        this.gotoPage(this.state.currentPage - (this.pageNeighbours * 2) - 1);
    }

    handleMoveRight = evt => {
        evt.preventDefault();
        this.gotoPage(this.state.currentPage + (this.pageNeighbours * 2) + 1);
    }

    render() {
        const page = this.fetchPageNumber();

        return (
            <Fragment>
                <Pagination>
                    {
                        page.map((page, index) => {
                            if (page === LEFT_PAGE) return <Pagination.Prev key={index} onClick={this.handleMoveLeft}/>
                            if (page === RIGHT_PAGE) return <Pagination.Next key={index} onClick={this.handleMoveRight}/>
                            return <Pagination.Item key={index}
                                                    onClick={this.handleClick(page)}>{page}</Pagination.Item>
                        })

                    }
                </Pagination>
            </Fragment>
        )
    }
}

const App = (props) => {
    const pageCount = data.length;
    // console.log(data)
    const [currentPage, setCurrentPage] = useState(1)
    const onPageChange = (res_data) => {
        const {currentPage} = res_data;

        setCurrentPage(currentPage);
    }

    return <Container>
        <CusPagination pageCount={pageCount} onPageChanged={onPageChange}/>
        {
            toHTML(data[currentPage - 1])
        }
    </Container>
}

export default App;
