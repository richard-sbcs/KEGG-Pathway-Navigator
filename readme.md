This repository contains the code and paper for our web application: [KEGG Pathway Navigator](https://richsbcs.pythonanywhere.com)

To run the code (i.e. host your own web application) follow the steps below. However, if you just want to use the application, just go to the web app directly using the link below.

[https://richsbcs.pythonanywhere.com](https://richsbcs.pythonanywhere.com)

Instructions to Run Code (Tested on macOS)
1. Clone this repo.
2. Install [python3](https://www.python.org) and [flask](http://flask.pocoo.org).
3. Activate the python virtual enviroment using `. venv/bin/activate`
4. Run code below or follow [Flask Instructions](http://flask.pocoo.org/docs/1.0/tutorial/factory/#run-the-application)

`export FLASK_APP=flaskr`

`export FLASK_ENV=development`

`flask run`

5. Webpage should be accesssible at `http://127.0.0.1:5000/` or whichever port flask is using.
