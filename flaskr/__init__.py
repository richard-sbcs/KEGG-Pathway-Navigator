import os
import requests
from flask import Flask, request
from flask import current_app, g
import sqlite3
import time
import json
import datetime
import traceback

#Flask SQLite wrapper.
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("CREATE TABLE IF NOT EXISTS dict (key text unique, value text)")
        print('Init db')

    return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()   
        
def parse_genes(text,name,code):
    lines = text.split("\n")
    t_desc = 'DESCRIPTION'
    t_gen = 'GENE'
    t_ent = 'ENTRY'
    err = True
    #verify to make sure id matches.
    for i in range(0,2):
        line = lines[i].strip()
        if line.startswith('ENTRY'):
            if line.split()[1].lower() == code:
                err = False
                break
        
    if err:
        raise ValueError('ID Mismatch.'+code+'    '+str(lines[0:10]))
        
    arr = [name+' ['+code+']','','']
    scan = False
    for i in range(len(lines)):
        line = lines[i].strip()
        if line.startswith(t_desc):
            arr[1] = line[len(t_desc):].strip()
        elif line.startswith(t_gen):
            if ';' not in line:
                arr[2] = line[line.rfind('['):line.rfind(']')+1]
            else:
                arr[2] = line[len(t_gen):].strip().split()[1][:-1]
            scan = True
        elif scan:
            if not lines[i][:1] == ' ':
                break
                
            if ';' not in line:
                arr[2] += ', '+line[line.rfind('['):line.rfind(']')+1]
            else:
                arr[2] += ', '+line.strip().split()[1][:-1]
    arr[0] = arr[0].replace("\t"," ")
    arr[1] = arr[1].replace("\t"," ")
    arr[2] = arr[2].replace("\t"," ")
    return arr


def expired(date_string):
    date = datetime.datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S.%f")
    delta = datetime.datetime.now()-date
    print(delta.days)
    return delta.days > 30

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)
    
    # TODO: release
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

   
    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
    @app.route('/pathways')
    def pathways():
        return app.send_static_file('pathways.html')
    
    @app.route("/api/organism_list")
    def api_organism_list():
        try:
            db = get_db()
            res = db.execute('SELECT value FROM dict WHERE key = ?', ('organism_list',)).fetchone()
            if res is not None:
                res = res[0]

                if not expired(res[:res.index("\n")]):
                    return res[res.index("\n")+1:]

            print('------------------REQUEST---------------------------')
            req = requests.get('http://rest.kegg.jp/list/organism')
            req.raise_for_status()
            text = req.text

            lines = text.split("\n");
            arr = [];
            for i in range(len(lines)):
                arr2 = ["", "", ""];
                values = lines[i].strip().split('\t')
                if len(values) < 3:
                    continue
                arr2[0] = values[2].strip()
                arr2[1] = values[1].lower().strip()

                arr2[2] = arr2[0][arr2[0].find("(")+1:arr2[0].find(")")].strip()
                arr.append(arr2)
            fin = json.dumps(arr)
            db.execute('REPLACE INTO dict (key, value) VALUES (?,?)', ("organism_list", str(datetime.datetime.now())+"\n"+fin))
            db.commit()

        
        except Exception as e:
            print('ERROR: '+str(e))
            traceback.print_exc()
            return json.dumps("")
        except:
            print('Unknown Error.')
            traceback.print_exc()
            return json.dumps("")
        return fin
    
    @app.route("/api/pathways",methods=['POST'])
    def api_pathways():
        try:
            prefix = request.get_json().lower()
            db = get_db()
            res = db.execute('SELECT value FROM dict WHERE key = ?', ('pathways_'+prefix,)).fetchone()
            if res is not None:
                res = res[0]
                if not expired(res[:res.index("\n")]):
                    return res[res.index("\n")+1:]

            print('------------------REQUEST---------------------------')
            req = requests.get('http://rest.kegg.jp/list/pathway/'+prefix)
            req.raise_for_status()
            text = req.text
            lines = text.split("\n");
            arr = [];
            for i in range(len(lines)):
                arr2 = ["", ""];
                values = lines[i].strip().split('\t')
                if len(values) < 2:
                    continue
                arr2[0] = values[1].strip()
                arr2[0] = arr2[0][:arr2[0].rfind('-')].strip()
                arr2[1] = values[0].lower().strip()
                if arr2[1].startswith('path:'):
                    arr2[1] = arr2[1][len('path:'):]

                arr.append(arr2)

            fin = json.dumps(arr)
            db.execute('REPLACE INTO dict (key, value) VALUES (?,?)', ('pathways_'+prefix, str(datetime.datetime.now())+"\n"+fin))
            db.commit()
        except Exception as e:
            print('ERROR: '+str(e))
            traceback.print_exc()
            return json.dumps("")
        except:
            print('Unknown Error.')
            traceback.print_exc()
            return json.dumps("")
        
        return fin
        

    @app.route("/api/gene",methods=['POST'])
    def api_gene():
        try:
            db = get_db()

            print(request.get_json())
            #text = req.text
            #texts = [fake3(),fake4()]

            batch = []
            
            batch_size = 10
            data = request.get_json()    
            for x in range (0,len(data),batch_size):#i,r in enumerate(request.get_json()):
                mini_batch = data[x:x+batch_size]
                ans = [None]*len(mini_batch)
                url = 'http://rest.kegg.jp/get/'
                should_req = False
                for i,pathway in enumerate(mini_batch):
                    idNum = pathway[1].lower()
                    res = db.execute('SELECT value FROM dict WHERE key = ?', ('gene_'+idNum,)).fetchone()
                    if res is not None:
                        res = res[0]
                        if not expired(res[:res.index("\n")]):
                            ans[i] = json.loads(res[res.index("\n")+1:])
                            continue
                    url += pathway[1].lower() + '+'
                    should_req = True
                if should_req:
                    url = url[:-1]

                    print('------------------REQUEST-BATCH---------------------------'+str(datetime.datetime.now()))
                    time.sleep(0.5)
                    req = requests.get(url)
                    print('DONE!'+str(datetime.datetime.now()))
                    req.raise_for_status()
                    texts = [t for t in req.text.split('\n///') if t.strip() != ""]
                    if len(texts) != sum(y is None for y in ans):
                        raise ValueError("Batch size mismatch.")

                    # Fill in the empty slots (i.e. the non-cached slots)
                    k = 0
                    for i,pathway in enumerate(ans):
                        if pathway is None:
                            idNum = mini_batch[i][1].lower()
                            ans[i] = parse_genes(texts[k],mini_batch[i][0],idNum)
                            db.execute('REPLACE INTO dict (key, value) VALUES (?,?)', ('gene_'+idNum, str(datetime.datetime.now())+"\n"+json.dumps(ans[i])))
                            k += 1
                            
                    batch.extend(ans)
                    db.commit()
                else:
                    batch.extend(ans)
            
        except Exception as e:
            print('ERROR: '+str(e))
            traceback.print_exc()
            return json.dumps("")
        except:
            print('Unknown Error.')
            traceback.print_exc()
            return json.dumps("")
        return json.dumps(batch)
        

    
    app.teardown_appcontext(close_db)
    return app
