# Documentation

This directory contains documentation and confguration files relevant to all 
Ardent services.

They are not specifically related to the authentication service, it's just a 
home for them until if and when there is somewhere else to put them.

You can use them to get an idea of stack is run in production, e.g. how the  
proxy server works, how the services are managed during deployment and how they 
recover in the event of a failure or system restart.

The deployment pipelines are very simple and uses GitHub Actions workflows 
to deploy changes using a role account and to restart services via pm2 after 
updates have been deployed.