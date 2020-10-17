import React, { Component } from "react";

import Image from "../../../components/Image/Image";
import "./SinglePost.css";

class SinglePost extends Component {
  state = {
    title: "",
    author: "",
    date: "",
    image: "",
    content: "",
  };

  async componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: `{
        post(id: "${postId}") {
          title
          content
          imageUrl
          creator {
            name
          }
          createdAt
        }
      }
      `,
    };
    try {
      const res = await fetch(`http://localhost:8080/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphqlQuery),
      });
      const resData = await res.json();
      console.log(resData);
      if (resData.errors) {
        throw new Error("Fetching post failed");
      }
      const {
        title,
        creator: { name: author },
        imageUrl,
        createdAt,
        content,
      } = resData.data.post;
      this.setState({
        title,
        author,
        image: `http://localhost:8080/${imageUrl}`,
        date: new Date(createdAt).toLocaleDateString("en-US"),
        content: content,
      });
    } catch (err) {
      console.log(err);
    }
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
