
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

    getWinner() {
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
                    return this.state[move];
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
                    return this.state[move];
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
                    return this.state[move];
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
                    return this.state[move];
                }
            }
        }
        return 0;   //无胜方
    }

    getMaxScoreMove(moves, if_return_all_scores) {
        var moves_score = new Int32Array(this.full_cnt);
        var sim_state;
        var s_cnt;

        if (moves.length == 0) return null;   //如果没有可走的棋，则返回null

        for (var i = 0, len = moves.length; i < len; i++) {   //每个可走的位置都遍历一遍
            var move = moves[i];
            var sim_state = _.cloneDeep(this.state);
            sim_state[move] = this.pid;


            var pos = this.move2pos(move);

            //三点
            s_cnt = 1;
            if (pos.col <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move + s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move + s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }
            //九点
            s_cnt = 1;
            if (pos.col >= this.sz - this.n - 1) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move - s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move - s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }


            //六点
            s_cnt = 1;
            if (pos.row <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move + s * this.sz]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move + s * this.sz]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }
            //十二点
            s_cnt = 1;
            if (pos.row >= this.sz - this.n - 1) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move - s * this.sz]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move - s * this.sz]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }

            //四点半
            s_cnt = 1;
            if (pos.col <= this.sz - this.n && pos.row <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move + s * this.sz + s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move + s * this.sz + s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }

            //十点半
            s_cnt = 1;
            if (pos.col >= this.sz - this.n - 1 && pos.row >= this.sz - this.n - 1) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move - s * this.sz - s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move - s * this.sz - s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }

            //一点半
            s_cnt = 1;
            if (pos.col <= this.sz - this.n && pos.row >= this.sz - this.n - 1) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move - s * this.sz + s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move - s * this.sz + s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }

            //七点半
            s_cnt = 1;
            if (pos.col >= this.sz - this.n - 1 && pos.row <= this.sz - this.n) {
                for (var s = 1; s < this.n; s++)
                    if (sim_state[move] == sim_state[move + s * this.sz - s]) s_cnt *= 10;
                    else if (sim_state[move] == 3 - sim_state[move + s * this.sz - s]) s_cnt /= 100;
                /*
                if (s_cnt == this.n) {
                    moves_score[move] += 10000;
                }
                */
                moves_score[move] += (s_cnt - 1);
            }
        }
        if (if_return_all_scores) return moves_score;

        var maxVal = Math.max.apply(null, moves_score);
        //console.log("maxVal: " + maxVal);
        var idxs = moves_score.indexsOf(maxVal);
        //console.log("idxs: " + idxs);
        if (idxs != -1) return idxs[Math.floor(Math.random() * idxs.length)]    //随机返回一个分值最大的move
        return null;
        //valid_moves[Math.floor(Math.random() * valid_moves.length)]      //随机返回一个可走的move
    }
}