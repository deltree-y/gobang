function sortNumber(a, b) {
    return a - b
}

class board_canvas {
    constructor(board_sz, cvs_sz) {
        this.sz = board_sz;
        this.cvs_sz = cvs_sz;
        this.unit_space = 0;
        this.border = 0;
        this.chess_radius = 0;
        this.enable_input = true;
        this.boardResize(this.cvs_sz);
    }

    boardResize(cvs_sz) {
        this.cvs_sz = cvs_sz;
        this.border = Math.round(((this.cvs_sz) / (this.sz - 1)) * 0.35);
        this.unit_space = (this.cvs_sz - 2 * this.border) / (this.sz - 1);
        this.chess_radius = Math.round(this.unit_space / 3.5);
    }

    transColRow(x, y) {
        return {
            col: Math.round((x - this.border) / this.unit_space),
            row: Math.round((y - this.border) / this.unit_space)
        }
    }
}

class board_state {
    constructor(board_sz, n_cnt) {
        this.sz = board_sz;
        this.n = n_cnt;
        this.full_cnt = this.sz * this.sz;
        this.state = new Int8Array(this.full_cnt);
        this.last_move = -1;
        this.pid = 1; // 表示该谁走，1为黑棋，2为白棋，初始化为黑棋
        this.game_end = false;
        this.placed_time = new Date().getTime();
        this.time_dur = 0;
    }

    doMove(move, is_fast_move) {
        if (this.state[move] != 0) {
            return false;
        } else {
            this.state[move] = this.pid;
            if (!is_fast_move) {
                var now_time = new Date().getTime();
                this.time_dur = (now_time - this.placed_time);
                this.placed_time = now_time;
            }
            this.pid = 3 - this.pid;
            this.last_move = move;
            return true;
        }
    }

    doPosMove(row, col) {
        let move = this.pos2move(row, col);
        return this.doMove(move, false);
    }

    pos2move(row, col) {
        return row * this.sz + col;
    }

    move2pos(move) {
        return {
            row: Math.floor(move / this.sz),
            col: (move % this.sz)
        }
    }

    getMoves() {
        var moves = new Array();
        for (var i = 0, len = this.state.length; i < len; i++) {
            if (this.state[i] != 0) {
                moves.push(i);
            }
        }
        if (moves.length > 0) return moves;
        return null;
    }

    getNoneMoves() {
        var moves = new Array();
        for (var i = 0, len = this.state.length; i < len; i++) {
            if (this.state[i] == 0) {
                moves.push(i);
            }
        }
        if (moves.length > 0) return moves;
        return null;
    }

    getResult(player_id) {
        var moves = this.getMoves();
        var s_cnt = 0;
        for (var i = 0, len = moves.length; i < len; i++) {
            var move = moves[i];
            var pos = this.move2pos(move);

            //横
            s_cnt = 1;
            if (pos.col <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (this.state[move] == this.state[move + s]) s_cnt++;
                //if (s_cnt == this.n) return this.state[move];
                if (s_cnt == this.n) {
                    //setElementText("debug", "横:" + pos.row + "," + pos.col);
                    return (this.state[move] == player_id ? 1 : -1);
                }
            }
            //竖
            s_cnt = 1;
            if (pos.row <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (this.state[move] == this.state[move + s * this.sz]) s_cnt++;
                //if (s_cnt == this.n) return this.state[move];
                if (s_cnt == this.n) {
                    //setElementText("debug", "竖");
                    return (this.state[move] == player_id ? 1 : -1);
                }
            }
            //斜右下
            s_cnt = 1;
            if ((pos.row <= this.sz - this.n) && (pos.col <= this.sz - this.n)) {
                for (var s = 1; s < this.n; s++)
                    if (this.state[move] == this.state[move + s * this.sz + s]) s_cnt++;
                //if (s_cnt == this.n) return this.state[move];
                if (s_cnt == this.n) {
                    //setElementText("debug", "斜右下");
                    return (this.state[move] == player_id ? 1 : -1);
                }
            }
            //斜左下
            s_cnt = 1;
            if ((pos.row <= this.sz - this.n) && (pos.col >= this.sz - this.n - 1)) {
                for (var s = 1; s < this.n; s++)
                    if (this.state[move] == this.state[move + s * this.sz - s]) s_cnt++;
                //if (s_cnt == this.n) return this.state[move];
                if (s_cnt == this.n) {
                    //setElementText("debug", "斜左下");
                    return (this.state[move] == player_id ? 1 : -1);
                }
            }
        }
        return 0;   //无胜方
    }

    getMoveScore(move, pid) {

    }

    getMaxScoreMove(moves, return_type, if_reverse) {   //return_type: 0-返回最高move及分值，1-返回所有分值，2-返回排序后的move
        var moves_score = new Array(this.full_cnt).fill(0);
        var moves_sorted = new Int8Array(this.full_cnt).fill(-1);
        var sim_state;
        var mapped_moves;
        var l_u = new line_unit(this.n);
        if (moves == null) return null;   //如果没有可走的棋，则返回null

        for (var i = 0, len = moves.length; i < len; i++) {   //每个可走的位置都遍历一遍
            if (i == 32 && if_reverse) debugger
            var move = moves[i];
            var sim_state = _.cloneDeep(this.state);

            sim_state[move] = if_reverse ? (3 - this.pid) : this.pid;
            var pid = if_reverse ? (3 - this.pid) : this.pid;
            var pos = this.move2pos(move);

            //三点
            l_u.reset();
            for (var s = 1; s < this.n; s++)
                if (pos.col + s < this.sz) {    //如果足够向后扩展，下同
                    if (sim_state[move + s] != 3 - pid) //只要不是对方棋子则继续判断，下同
                        l_u.set('f', s, (sim_state[move + s] == pid) ? 1 : 0)  //若相同则记1，否则记0，下同
                } else break;
            //九点
            for (var s = 1; s < this.n; s++)
                if (pos.col - s >= 0) {
                    if (sim_state[move - s] != 3 - pid)
                        l_u.set('b', s, (sim_state[move - s] == pid) ? 1 : 0)
                } else break;
            moves_score[move] += l_u.calcScore();


            //六点
            l_u.reset();
            for (var s = 1; s < this.n; s++)
                if (pos.row + s < this.sz) {
                    if (sim_state[move + s * this.sz] != 3 - pid)
                        l_u.set('f', s, (sim_state[move + s * this.sz] == pid) ? 1 : 0);
                } else break;
            //十二点
            for (var s = 1; s < this.n; s++)
                if (pos.row - s >= 0) {
                    if (sim_state[move - s * this.sz] != 3 - pid)
                        l_u.set('b', s, (sim_state[move - s * this.sz] == pid) ? 1 : 0);
                } else break;
            moves_score[move] += l_u.calcScore();


            //一点半
            l_u.reset();
            for (var s = 1; s < this.n; s++)
                if (pos.col + s < this.sz && pos.row - s >= 0) {
                    if (sim_state[move - s * this.sz + s] != 3 - pid)
                        l_u.set('f', s, (sim_state[move - s * this.sz + s] == pid) ? 1 : 0);
                } else break;
            //七点半
            for (var s = 1; s < this.n; s++)
                if (pos.col - s >= 0 && pos.row + s < this.sz) {
                    if (sim_state[move + s * this.sz - s] != 3 - pid)
                        l_u.set('b', s, (sim_state[move + s * this.sz - s] == pid) ? 1 : 0);
                } else break;
            moves_score[move] += l_u.calcScore();


            //四点半
            l_u.reset();
            for (var s = 1; s < this.n; s++)
                if (pos.col + s < this.sz && pos.row + s < this.sz) {
                    if (sim_state[move + s * this.sz + s] != 3 - pid)
                        l_u.set('f', s, (sim_state[move + s * this.sz + s] == pid) ? 1 : 0);
                } else break;
            //十点半
            for (var s = 1; s < this.n; s++)
                if (pos.col - s >= 0 && pos.row - s >= 0) {
                    if (sim_state[move - s * this.sz - s] != 3 - pid)
                        l_u.set('b', s, (sim_state[move - s * this.sz - s] == pid) ? 1 : 0);
                } else break;
            moves_score[move] += l_u.calcScore();
        }

        switch (return_type) {
            case 0: {
                var maxVal = Math.max.apply(null, moves_score);
                //console.log("maxVal: " + maxVal);
                var idxs = moves_score.indexsOf(maxVal);
                //console.log("idxs: " + idxs);
                if (idxs != -1) return {
                    idx: idxs[Math.floor(Math.random() * idxs.length)],    //随机返回一个分值最大的move
                    val: maxVal
                }
                return null;
                //valid_moves[Math.floor(Math.random() * valid_moves.length)]      //随机返回一个可走的move
            }
            case 1:
                return moves_score;
            case 2: {
                // 对需要排序的数字和位置的临时存储
                mapped_moves = moves_score.map(function (el, i) {
                    return {
                        index: i,
                        value: el
                    }
                });
                // 按照多个值排序数组
                mapped_moves.sort(function (a, b) {
                    return a.value - b.value;
                });
                // 根据索引得到排序的结果
                moves_sorted = mapped_moves.map(function (el) {
                    return el.index;
                });
                return moves_sorted.reverse();
            }
        }
    }
}

class line_unit {
    constructor(unit_len) {
        this.unit_len = unit_len;
        this.line_len = this.unit_len * 2 - 1;
        this.middle_idx = unit_len - 1;
        this.unit = new Array(this.line_len).fill(2);
        this.weight = [1, 3, 10, 3, 1];
    }

    reset() {
        this.unit.fill(2);   //'2' means rival  
        this.unit[this.middle_idx] = 1;
    }

    set(dir, itv, val) {
        if (dir == "f")
            this.unit[this.middle_idx + itv] = val;
        else
            this.unit[this.middle_idx - itv] = val;
    }

    calcScore() {
        var score = 0;
        for (var i = 0; i < this.unit_len; i++) {
            var unit_unit = this.unit.slice(i, i + this.unit_len);
            if (unit_unit.indexOf(2) == -1)
                score += this.weight[i] * this.getSingleScore(unit_unit, i);
        }
        return score;
    }

    getSingleScore(inSeq) {
        switch (inSeq.join('')) {
            case '10000':
            case '01000':
            case '00100':
            case '00010':
            case '00001': return 1;

            case '11000':
            case '01100':
            case '00110':
            case '00011': return 20;

            case '10100':
            case '01010':
            case '00101': return 10;

            case '10010':
            case '01001': return 5;

            case '10001': return 2;

            case '10110':
            case '01011':
            case '11010':
            case '01101': return 200;

            case '10011':
            case '11001': return 100;

            case '10101': return 50;

            case '11100':
            case '01110':
            case '00111': return 500;

            case '10111':
            case '11011':
            case '11101': return 1000;

            case '11110':
            case '01111': return 5000;

            case '11111': return 100000;
            default: {
                debugger
                return 0;
            }
        }
    }
}
