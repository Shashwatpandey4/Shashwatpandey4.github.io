---
title: Understanding SSH as a Data professional
author: Shashwat Pandey
date: 2024-08-17 17:00:00 +0800
categories: [Network, Security]
tags: [Data Engineering, SSH, GCP]
image:
  path: /assets/img/ssh.png
---


# Understanding SSH as a Data professional

### What is SSH?

SSH (Secure Shell) is a network protocol that enables secure communication over an unsecured network using cryptographic techniques. It generates a pair of keys (public and private) to establish a secure channel, ensuring that the data transmitted, such as login credentials and commands, is encrypted. This encryption protects sensitive information from interception, maintaining the privacy and integrity of the data.

### How Does It Work?

SSH works by establishing a secure connection between a client (your local machine) and a server. The process begins with the server sending its public key to the client, which the client uses to verify the server's identity. The client then generates a session key, encrypts it with the server's public key, and sends it back to the server. The server decrypts this session key with its private key, enabling both the client and server to securely communicate using this shared session key. Authentication occurs when the server challenges the client, and the client proves its identity by decrypting a message with its private key. Once verified, the SSH session is fully encrypted, ensuring all data transmitted between the client and server remains secure.

### Hands-on SSH

Let's understand this concept by developing a simple project, in this project we will :
- Generate SSH keys
- setup a remote server (a VM in GCP)
- securely transfer data to a remote server
- setup ssh tunneling

---

Let's generate our ssh key

SSH is usually pre-installed. You can check that by running :
``` 
ssh -V 
```
and  make sure you have a .ssh directory, if not then create it using the following command :

```
mkdir ~/.ssh
```

now let's generate the key's using the following command :
```
ssh-keygen -t rsa -b 4096 -C "email@example.com" 
```
Explanation:

- `-t rsa`: Specifies the type of key to create.
- `-b 4096`: Specifies the number of bits in the key (4096 is secure).
- `-C "email@example.com"`: Adds a label to the key for identification.

Follow the prompts:

- Save the key in the default location (`~/.ssh/id_rsa`).
- Optionally, set a passphrase for extra security.

Now you have 2 keys :
1. public key : `id_rsa.pub`
2. private key : `id_rsa`

this private key stay on your machine and the public key will be added to the server.

you can see them by using command :
```
cat id_rsa
```

![generating ssh](/assets/img/generating_ssh.png)

let's now create our server, we are going to initiate a VM instance on Google Cloud

Create a new VM instance:
- Go to the GCP Console.
- Navigate to Compute Engine > VM instances.
- Click "Create Instance" and configure it with your preferred options

see below :

- first let's give a name to our VM

![](/assets/img/vm_1.png)

- now we'll select the machine type, i'm going with micro, just for demonstration purposes. 

![](/assets/img/vm_2.png)

- Now in the securities tab, add your ssh key, remember to add `id_rsa.pub`

![](/assets/img/vm_3.png)


now hit the create button, within few minutes our vm will be up and running

![](/assets/img/vm_4.png)


now let's test our connection, to do that we will use the following command in our local terminal :

```
ssh user@external_ip
```

now if you'' see we have established the connection with our vm

![](/assets/img/ssh_1.png)

also if you wish to open the VM's terminal you can do that here :

![](/assets/img/ssh_2.png)


### Secure Data Transfer
In this step, we'll securely transfer data from our local machine to the remote server using SCP and explore additional operations like compressing files and verifying their integrity.

1. Transfer Data Using SCP :

    SCP (Secure Copy Protocol) is a command-line utility that allows you to securely transfer files and directories between your local machine and a remote server over SSH.

    ```
    scp Desktop/Shashwat/ssh.md shashwat002347@34.94.213.73:~
    ```

    ![](/assets/img/scp_1.png)

    You can also transfer entire directories using the -r (recursive) option with SCP.

    ```
    scp -r /home/user/data/ user@external_ip:/home/user/remote_data/
    ```

### Setup SSH Tunneling

SSH tunneling allows you to securely forward traffic from your local machine to a remote server (or vice versa) through an encrypted SSH connection. This is particularly useful for accessing services on a remote server that aren’t directly exposed to the internet, such as databases or web applications.

In this step, we'll cover three types of SSH tunneling:

- Local Port Forwarding
- Remote Port Forwarding
- Dynamic Port Forwarding
    
    
    We'll also set up a practical example by accessing a remote Jupyter Notebook server using SSH tunneling.

1. **Local Port Forwarding**

    Local port forwarding allows you to access a remote service (e.g., a database or web server) on your local machine as if it were running locally.

    Suppose you have a Jupyter Notebook server running on the remote server at http://localhost:8888, and you want to access it on your local machine at http://localhost:8888.

    ![](/assets/img/localport_forwarding_1.png)

    in the above image, on the left terminal if you'll see, I've ssh into the vm and started the jupyter notebook server without opening a browser, on port 8888

    and on the right in a new terminal i've forwarded that server onto my port 8888 in my local machine

    by running the following command:

    ```
    ssh -L 8888:localhost:8888 user@external_ip
    ```

    Explanation:

    - -L: Specifies local port forwarding.
    - 8888:localhost:8888: Maps your local port 8888 to the remote server’s port 8888 on localhost.
    - user@external_ip: Your SSH username and the remote server’s IP address.
    
    Access the Jupyter Notebook:

    use the highlighted link shown on the left terminal it contains the access token as well which is required to open the jupyter notebook
    
    This will securely forward traffic to the remote Jupyter Notebook server.

    ![](/assets/img/localport_forwarding_2.png)

    ----


2. **Remote Port Forwarding**

    Remote port forwarding allows you to expose a service running on your local machine to the remote server.

    assume you’re running a web server on your local machine at http://localhost:8000, and you want to make it accessible on the remote server.

    Run the following command:

    ```
    ssh -R 9000:localhost:8000 user@external_ip
    ```

    Explanation:

    - -R: Specifies remote port forwarding.
    - 9000:localhost:8000: Maps the remote server’s port 9000 to your local machine’s port 8000.
    - user@external_ip: Your SSH username and the remote server’s IP address.

    Access the Local Web Server from the Remote Server:

    On the remote server, you can now access your local web server by going to http://localhost:9000.

    ---

3. **Dynamic Port Forwarding**

    Dynamic port forwarding allows you to create a SOCKS proxy server that can forward traffic to multiple destinations.

    Suppose you want to route your browser traffic through the remote server using a SOCKS proxy.

    Run the following command:
    ```
    ssh -D 1080 user@external_ip
    ```

    Explanation:

    -   -D: Specifies dynamic port forwarding.
    -   1080: The local port to use for the SOCKS proxy.
    -   user@external_ip: Your SSH username and the remote server’s IP address.
    
    Configure Your Browser:

    In your browser settings, configure the proxy settings to use localhost on port 1080 for SOCKS5 proxy.
    
    Now, your browser traffic will be routed through the remote server.

---

### Outro: Bridging to Real-World Applications

In this blog post, we walked through the basics of SSH and demonstrated how to set up SSH tunneling for secure data transfer and processing on remote servers. While the examples provided were basic, they reflect the foundational techniques used in real-world data engineering projects. 

In practice, these methods are applied to more complex workflows, such as managing distributed databases, securing communications between microservices, or handling large-scale data processing tasks across multiple servers. For instance, in a production environment, you might use SSH tunneling to secure connections between cloud-based ETL pipelines, ensuring that sensitive data is protected during transfer.

To provide a concrete example, imagine a scenario where a data engineering team is responsible for processing and transferring large volumes of customer data between geographically distributed data centers. The team could use SSH tunneling to securely connect to these remote servers, automate the processing tasks, and ensure that the data is encrypted during transit. This approach not only secures the data but also simplifies remote management, making it easier to scale operations as the project grows.

By understanding the basics, you're now equipped to explore and implement SSH in your own projects, and with practice, you'll find that these techniques are invaluable in creating secure, scalable, and efficient data engineering workflows.


